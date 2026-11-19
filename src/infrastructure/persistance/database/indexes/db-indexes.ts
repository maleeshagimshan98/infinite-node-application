/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { mongooseConfig } from '@/infrastructure/persistance/database/service/database-mapper/driver/mongoose.config';
import { MongooseDriver } from '@/infrastructure/persistance/database/service/database-mapper/driver/mongoose.driver';

import type { IndexDefinition, IndexOptions, SchemaType } from 'mongoose';

/** A compiled Mongoose model of any schema. */
export type IndexedModel = (typeof mongoose.models)[string];

/** The folder whose `*.model.ts` files declare every schema the application persists. */
const MODELS_DIR = path.resolve(__dirname, '../repositories/mongoose');

/** How many document ids to list for each group of duplicates. */
const MAX_IDS_PER_GROUP = 10;

/** One set of documents that share the key values of a unique index, so the index cannot be built. */
export interface IDuplicateGroup {
  /** The shared key values. */
  keys: Record<string, unknown>;
  /** How many documents share them. */
  count: number;
  /** The first ids of those documents (at most MAX_IDS_PER_GROUP). */
  ids: string[];
}

/** The audit of one unique index declared in a schema. */
export interface IUniqueIndexAudit {
  /** The index keys and options, e.g. `{"email":1} unique partial {"status":"pending"}`. */
  index: string;
  duplicates: IDuplicateGroup[];
}

/** What `db:indexes` found, and did, for one model. */
export interface IModelIndexReport {
  model: string;
  collection: string;
  uniqueIndexes: IUniqueIndexAudit[];
  /** Documents without a version key (`__v`); the repository can neither read nor update them. */
  missingVersion: number;
  /**
   * Per string field whose schema path is `lowercase` / `trim`: how many documents store a value that is not
   * normalized. Lookups normalize their input, so they cannot find these documents.
   */
  unnormalized: Record<string, number>;
  /** Per such field: how many documents were normalized; set only when changes were applied. */
  normalized?: Record<string, number>;
  /** Schema indexes the collection does not have yet. */
  toCreate: string[];
  /** Collection indexes the schema does not declare. Reported only: dropping an index stays a reviewed manual step. */
  toDrop: string[];
  /** Documents given `__v: 0`; set only when changes were applied. */
  backfilled?: number;
  /** Set only when the index build failed. */
  buildError?: string;
}

/** The result of one `db:indexes` run. */
export interface IDbIndexesResult {
  /** True when changes were applied: not a check run, and the audit found no duplicates. */
  applied: boolean;
  /** True when the audit found no duplicates and every index build succeeded. */
  ok: boolean;
  reports: IModelIndexReport[];
}

/**
 * Import every `*.model.ts` (or compiled `*.model.js`) file under the repositories folder, which compiles its
 * Mongoose model, and return every model registered on the default connection.
 *
 * @param {string} [dir=MODELS_DIR] - The folder to search, recursively.
 * @returns {IndexedModel[]} The compiled models.
 * @throws {Error} when a model file cannot be read or loaded.
 */
export function loadModels(dir: string = MODELS_DIR): IndexedModel[] {
  const files = fs
    .readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.model\.(ts|js)$/.test(file) && !file.endsWith('.d.ts'))
    .sort();
  for (const file of files) {
    // require(), not import(): under tsx, import() of a Windows path needs a file:// URL, while tsc compiles import()
    // to require() for dist anyway. Loading the file is the point; its exports are not used.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(path.join(dir, file));
  }
  return mongoose.modelNames().map((name) => mongoose.model(name));
}

/**
 * Describe an index by its keys and the options that change what it enforces.
 *
 * @param {IndexDefinition} keys - The index keys, e.g. `{ email: 1 }`.
 * @param {IndexOptions} options - The index options.
 * @returns {string} A one-line description for the report.
 */
function describeIndex(keys: IndexDefinition, options: IndexOptions): string {
  const parts = [JSON.stringify(keys)];
  if (options.unique) {
    parts.push('unique');
  }
  if (options.sparse) {
    parts.push('sparse');
  }
  if (options.partialFilterExpression) {
    parts.push(`partial ${JSON.stringify(options.partialFilterExpression)}`);
  }
  return parts.join(' ');
}

/**
 * Read how a top-level string path normalizes its value: Mongoose's `lowercase` and `trim` options.
 *
 * @param {IndexedModel} model - The model whose schema declares the path.
 * @param {string} field - The path.
 * @returns {{ lowercase: boolean; trim: boolean } | null} The normalization, or null when the path is not a string
 * path that declares one.
 */
function fieldNormalization(model: IndexedModel, field: string): { lowercase: boolean; trim: boolean } | null {
  const schemaType: SchemaType | undefined = model.schema.path(field);
  if (!schemaType || schemaType.instance !== 'String') {
    return null;
  }
  const lowercase = schemaType.options.lowercase === true;
  const trim = schemaType.options.trim === true;
  return lowercase || trim ? { lowercase, trim } : null;
}

/**
 * Build the aggregation expression for a field's value as its schema path normalizes it, so the audit compares
 * values the way the application stores and looks them up (e.g. `Jane@X.com` and `jane@x.com` are the same email).
 *
 * @param {IndexedModel} model - The model whose schema declares the field.
 * @param {string} field - The field.
 * @returns {unknown} `$field`, wrapped in `$trim` and / or `$toLower` as the schema path declares.
 */
function normalizedValue(model: IndexedModel, field: string): unknown {
  const normalization = fieldNormalization(model, field);
  let value: unknown = `$${field}`;
  if (normalization?.trim) {
    value = { $trim: { input: value } };
  }
  if (normalization?.lowercase) {
    value = { $toLower: value };
  }
  return value;
}

/**
 * Build the filter for documents that store a field's string value differently from its normalized form.
 *
 * @param {IndexedModel} model - The model whose schema declares the field.
 * @param {string} field - A field whose schema path is `lowercase` / `trim`.
 * @returns {Record<string, unknown>} The filter.
 */
function unnormalizedFilter(model: IndexedModel, field: string): Record<string, unknown> {
  return { [field]: { $type: 'string' }, $expr: { $ne: [`$${field}`, normalizedValue(model, field)] } };
}

/**
 * List the top-level string fields whose schema path normalizes the value (`lowercase` / `trim`).
 *
 * @param {IndexedModel} model - The model to inspect.
 * @returns {string[]} The fields, e.g. `['email']`.
 */
function normalizedFields(model: IndexedModel): string[] {
  const fields: string[] = [];
  model.schema.eachPath((field) => {
    if (fieldNormalization(model, field)) {
      fields.push(field);
    }
  });
  return fields;
}

/**
 * Check whether a value is an index as `Model.diffIndexes({ indexOptionsToCreate: true })` lists one: its keys and
 * its options.
 *
 * @param {unknown} value - One entry of `toCreate`.
 * @returns {value is [IndexDefinition, IndexOptions]} True for a `[keys, options]` pair.
 */
function isIndexSpec(value: unknown): value is [IndexDefinition, IndexOptions] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    typeof value[1] === 'object' &&
    value[1] !== null
  );
}

/**
 * Find the groups of documents that a unique index would reject: documents inside the index's partial filter that
 * share the values of every index key. A key whose schema path is `lowercase` / `trim` is compared normalized, so
 * case variants of one email are listed too: once normalized they would collide. Like the index, a document without
 * a key groups with the others that lack it (unless the index is sparse). It compares whole field values, which
 * matches a unique index on scalar fields, the only kind the schemas declare.
 *
 * @param {IndexedModel} model - The model whose collection to audit.
 * @param {IndexDefinition} keys - The unique index keys.
 * @param {IndexOptions} options - The unique index options.
 * @returns {Promise<IDuplicateGroup[]>} Every group with more than one document, largest first.
 * @throws {Error} when the aggregation fails (the MongoDB driver error, unchanged).
 */
export async function findDuplicates(
  model: IndexedModel,
  keys: IndexDefinition,
  options: IndexOptions,
): Promise<IDuplicateGroup[]> {
  const fields = Object.keys(keys);
  const match: Record<string, unknown> = { ...(options.partialFilterExpression ?? {}) };
  if (options.sparse) {
    match.$or = fields.map((field) => ({ [field]: { $exists: true } }));
  }
  // $group field names cannot contain dots, so the keys are grouped as k0, k1, ... and named again below.
  const groupKey = Object.fromEntries(fields.map((field, i) => [`k${i}`, normalizedValue(model, field)]));

  const groups = await model.collection
    .aggregate(
      [
        { $match: match },
        { $group: { _id: groupKey, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 1, count: 1, ids: { $slice: ['$ids', MAX_IDS_PER_GROUP] } } },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  return groups.map((group) => ({
    keys: Object.fromEntries(fields.map((field, i) => [field, group._id?.[`k${i}`] ?? null])),
    count: Number(group.count),
    ids: Array.isArray(group.ids) ? group.ids.map((id: unknown) => String(id)) : [],
  }));
}

/**
 * Audit one model without changing anything: duplicates for each unique index, documents without a version key or
 * with a value their schema normalizes stored un-normalized, and the indexes the collection is missing or has beyond
 * the schema.
 *
 * @param {IndexedModel} model - The model to audit.
 * @returns {Promise<IModelIndexReport>} The model's report.
 * @throws {Error} when a query fails (the MongoDB driver error, unchanged).
 */
export async function auditModel(model: IndexedModel): Promise<IModelIndexReport> {
  const uniqueIndexes: IUniqueIndexAudit[] = [];
  for (const [keys, options] of model.schema.indexes()) {
    if (options.unique) {
      uniqueIndexes.push({
        index: describeIndex(keys, options),
        duplicates: await findDuplicates(model, keys, options),
      });
    }
  }

  const missingVersion = await model.collection.countDocuments({ __v: { $exists: false } });
  const unnormalized: Record<string, number> = {};
  for (const field of normalizedFields(model)) {
    unnormalized[field] = await model.collection.countDocuments(unnormalizedFilter(model, field));
  }
  const { toCreate, toDrop } = await model.diffIndexes({ indexOptionsToCreate: true });

  return {
    model: model.modelName,
    collection: model.collection.collectionName,
    uniqueIndexes,
    missingVersion,
    unnormalized,
    toCreate: toCreate.map((index: unknown) =>
      isIndexSpec(index) ? describeIndex(index[0], index[1]) : JSON.stringify(index),
    ),
    toDrop: toDrop.map((index: unknown) => String(index)),
  };
}

/**
 * Apply one model's changes: normalize the values the schema normalizes (safe only because the audit, which compares
 * them normalized, found no duplicates), give every document without a version key `__v: 0`, then build the schema's
 * missing indexes. Never drops an index (no `syncIndexes()`). A failed build is recorded on the report, not thrown.
 *
 * @param {IndexedModel} model - The model to apply.
 * @param {IModelIndexReport} report - The model's audit report, completed in place.
 * @returns {Promise<void>}
 * @throws {Error} when an update fails (the MongoDB driver error, unchanged).
 * A failed index build is recorded on the report instead.
 */
async function applyModel(model: IndexedModel, report: IModelIndexReport): Promise<void> {
  // Through the driver, so neither change touches updatedAt.
  report.normalized = {};
  for (const field of Object.keys(report.unnormalized)) {
    const { modifiedCount: normalizedCount } = await model.collection.updateMany(unnormalizedFilter(model, field), [
      { $set: { [field]: normalizedValue(model, field) } },
    ]);
    report.normalized[field] = normalizedCount;
  }
  const { modifiedCount } = await model.collection.updateMany({ __v: { $exists: false } }, { $set: { __v: 0 } });
  report.backfilled = modifiedCount;
  try {
    await model.createIndexes();
  } catch (error) {
    report.buildError = error instanceof Error ? error.message : String(error);
  }
}

/**
 * Audit every model, and unless this is a check run or the audit found duplicates, backfill missing version keys
 * and build missing indexes. Nothing is changed when any unique index has duplicates, so a run never half-applies.
 *
 * @param {IndexedModel[]} models - The models to audit and apply.
 * @param {{ check: boolean }} options - `check: true` audits and diffs only.
 * @returns {Promise<IDbIndexesResult>} The reports, whether changes were applied, and whether the run succeeded.
 * @throws {Error} when a query or an update fails (the MongoDB driver error, unchanged).
 */
export async function runDbIndexes(models: IndexedModel[], options: { check: boolean }): Promise<IDbIndexesResult> {
  const reports: IModelIndexReport[] = [];
  for (const model of models) {
    reports.push(await auditModel(model));
  }

  const hasDuplicates = reports.some((report) => report.uniqueIndexes.some((index) => index.duplicates.length > 0));
  const applied = !options.check && !hasDuplicates;
  if (applied) {
    for (const [i, model] of models.entries()) {
      const report = reports[i];
      if (report) {
        await applyModel(model, report);
      }
    }
  }

  const buildFailed = reports.some((report) => report.buildError !== undefined);
  return { applied, ok: !hasDuplicates && !buildFailed, reports };
}

/**
 * Render a run's result as the text the CLI prints.
 *
 * @param {IDbIndexesResult} result - The run's result.
 * @param {{ check: boolean }} options - Whether this was a check run.
 * @returns {string} The report, one model per block.
 */
export function formatReport(result: IDbIndexesResult, options: { check: boolean }): string {
  const lines: string[] = [];
  for (const report of result.reports) {
    lines.push(`${report.model} (${report.collection})`);
    for (const index of report.uniqueIndexes) {
      if (index.duplicates.length === 0) {
        lines.push(`  ok         ${index.index}`);
        continue;
      }
      lines.push(`  DUPLICATES ${index.index}`);
      for (const group of index.duplicates) {
        lines.push(`    ${group.count} documents share ${JSON.stringify(group.keys)}: ${group.ids.join(', ')}`);
      }
    }
    if (report.missingVersion > 0) {
      lines.push(`  ${report.missingVersion} documents have no __v`);
    }
    for (const [field, count] of Object.entries(report.unnormalized)) {
      if (count > 0) {
        lines.push(`  ${count} documents store ${field} untrimmed or not in lowercase; lookups cannot find them`);
      }
    }
    for (const [field, count] of Object.entries(report.normalized ?? {})) {
      if (count > 0) {
        lines.push(`  normalized ${field} on ${count} documents`);
      }
    }
    report.toCreate.forEach((index) => lines.push(`  to create  ${index}`));
    report.toDrop.forEach((index) => lines.push(`  not in schema (drop by hand after review): ${index}`));
    if (report.backfilled) {
      lines.push(`  backfilled __v: 0 on ${report.backfilled} documents`);
    }
    if (report.buildError !== undefined) {
      lines.push(`  BUILD FAILED: ${report.buildError}`);
    }
  }

  lines.push('');
  if (!result.ok) {
    lines.push(
      result.applied
        ? 'db:indexes failed: an index build failed.'
        : 'db:indexes failed: resolve the duplicates above by hand, then run it again. Nothing was changed.',
    );
  } else if (options.check) {
    lines.push('db:indexes --check: no duplicates. Nothing was changed.');
  } else {
    lines.push('db:indexes: indexes are up to date.');
  }
  return `${lines.join('\n')}\n`;
}

/**
 * CLI entry point: `npm run db:indexes` (apply), `npm run db:indexes:check` (audit only) and `npm run db:indexes:prod`
 * (compiled, for the production image). Exits 1 on any duplicate, failed build or connection failure.
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  dotenv.config({ path: path.resolve(__dirname, `../../../../../.env.${process.env.NODE_ENV}`) });
  dotenv.config();
  const check = process.argv.slice(2).includes('--check');

  // autoIndex off: this script decides when indexes are built, after the audit.
  const config = mongooseConfig();
  const driver = new MongooseDriver({ ...config, options: { ...config.options, autoIndex: false } });

  let exitCode = 1;
  try {
    await driver.init();
    const result = await runDbIndexes(loadModels(), { check });
    process.stdout.write(formatReport(result, { check }));
    exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`db:indexes failed: ${error instanceof Error ? error.message : String(error)}\n`);
  } finally {
    await driver.shutdown().catch(() => undefined);
  }
  process.exit(exitCode);
}

if (require.main === module) {
  void main();
}
