/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 *
 * Integration tests for the db:indexes script against a real MongoDB database of their own. A probe model with
 * autoIndex off stands in for the application's models, so duplicates can be planted before its index exists.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import mongoose, { Schema } from 'mongoose';

import {
  connectToTestDB,
  disconnectFromTestDB,
  dropTestDB,
} from '../repositories/mongoose/base/test-helpers/mongodb-test-helper';
import { formatReport, loadModels, runDbIndexes } from './db-indexes';

interface IProbe {
  code: string;
  active: boolean;
}

const ProbeSchema = new Schema<IProbe>({ code: String, active: Boolean }, { autoIndex: false });
ProbeSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { active: true } });
const ProbeModel = mongoose.model<IProbe>('db_indexes_probe', ProbeSchema);

const PROBE_INDEX = '{"code":1} unique partial {"active":true}';

interface IEmailProbe {
  email: string;
}

// Like the users collection: a unique email that the schema stores trimmed and in lowercase.
const EmailProbeSchema = new Schema<IEmailProbe>(
  { email: { type: String, lowercase: true, trim: true } },
  { autoIndex: false },
);
EmailProbeSchema.index({ email: 1 }, { unique: true });
const EmailProbeModel = mongoose.model<IEmailProbe>('db_indexes_email_probe', EmailProbeSchema);

/**
 * List the names of the probe collection's indexes.
 *
 * @returns {Promise<string[]>} The index names, e.g. `_id_` and `code_1`.
 */
async function probeIndexNames(): Promise<string[]> {
  const indexes = await ProbeModel.collection.indexes();
  return indexes.map((index) => String(index.name));
}

describe('db:indexes', () => {
  beforeAll(async () => {
    await connectToTestDB('infinite-node-application-test-db-indexes');
  });

  beforeEach(async () => {
    // Drop the collections, not only their documents: a test may have built an index.
    await ProbeModel.collection.drop().catch(() => undefined);
    await EmailProbeModel.collection.drop().catch(() => undefined);
  });

  afterAll(async () => {
    await dropTestDB();
    await disconnectFromTestDB();
  });

  it('lists a planted duplicate, fails, and changes nothing', async () => {
    // Bypass Mongoose, so the documents have no __v either.
    const { insertedIds } = await ProbeModel.collection.insertMany([
      { code: 'A', active: true },
      { code: 'A', active: true },
      { code: 'A', active: false },
      { code: 'B', active: true },
    ]);

    const result = await runDbIndexes([ProbeModel], { check: false });

    expect(result).toMatchObject({ ok: false, applied: false });
    expect(result.reports[0]).toMatchObject({
      missingVersion: 4,
      uniqueIndexes: [
        {
          index: PROBE_INDEX,
          duplicates: [
            { keys: { code: 'A' }, count: 2, ids: [insertedIds[0]?.toString(), insertedIds[1]?.toString()] },
          ],
        },
      ],
    });
    expect(await probeIndexNames()).toEqual(['_id_']);
    expect(await ProbeModel.collection.countDocuments({ __v: { $exists: true } })).toBe(0);

    const report = formatReport(result, { check: false });
    expect(report).toContain(`DUPLICATES ${PROBE_INDEX}`);
    expect(report).toContain('2 documents share {"code":"A"}');
    expect(report).toContain('Nothing was changed');
  });

  it('with --check, reports the missing index and the documents without __v, and changes nothing', async () => {
    await ProbeModel.collection.insertMany([
      { code: 'A', active: true },
      { code: 'A', active: false },
    ]);

    const result = await runDbIndexes([ProbeModel], { check: true });

    expect(result).toMatchObject({ ok: true, applied: false });
    expect(result.reports[0]).toMatchObject({ missingVersion: 2, toCreate: [PROBE_INDEX], toDrop: [] });
    expect(await probeIndexNames()).toEqual(['_id_']);
  });

  it('backfills __v: 0 and builds the missing index, then has nothing left to do', async () => {
    await ProbeModel.collection.insertMany([
      { code: 'A', active: true },
      { code: 'A', active: false },
    ]);

    const result = await runDbIndexes([ProbeModel], { check: false });

    expect(result).toMatchObject({ ok: true, applied: true });
    expect(result.reports[0]).toMatchObject({ backfilled: 2 });
    expect(await probeIndexNames()).toEqual(['_id_', 'code_1']);
    expect(await ProbeModel.collection.countDocuments({ __v: 0 })).toBe(2);
    await expect(ProbeModel.create({ code: 'A', active: true })).rejects.toMatchObject({ code: 11000 });

    const rerun = await runDbIndexes([ProbeModel], { check: false });
    expect(rerun.reports[0]).toMatchObject({ missingVersion: 0, toCreate: [], backfilled: 0 });
  });

  it('lists emails that differ only in case or surrounding spaces as duplicates', async () => {
    await EmailProbeModel.collection.insertMany([{ email: 'Jane@Example.com' }, { email: ' jane@example.com' }]);

    const result = await runDbIndexes([EmailProbeModel], { check: false });

    expect(result).toMatchObject({ ok: false, applied: false });
    expect(result.reports[0]?.uniqueIndexes[0]?.duplicates).toEqual([
      expect.objectContaining({ keys: { email: 'jane@example.com' }, count: 2 }),
    ]);
  });

  it('reports emails stored un-normalized, and normalizes them when it applies', async () => {
    await EmailProbeModel.collection.insertMany([{ email: ' Jane@Example.com' }, { email: 'bob@example.com' }]);

    const check = await runDbIndexes([EmailProbeModel], { check: true });
    expect(check.reports[0]).toMatchObject({ unnormalized: { email: 1 } });
    expect(formatReport(check, { check: true })).toContain('1 documents store email untrimmed or not in lowercase');

    const applied = await runDbIndexes([EmailProbeModel], { check: false });
    expect(applied).toMatchObject({ ok: true, applied: true });
    expect(applied.reports[0]).toMatchObject({ normalized: { email: 1 } });
    const emails = await EmailProbeModel.collection.distinct('email');
    expect(emails.sort()).toEqual(['bob@example.com', 'jane@example.com']);
  });

  it('loads every model declared under the repositories folder', () => {
    const names = loadModels().map((model) => model.modelName);

    expect(names).toEqual(
      expect.arrayContaining([
        'user',
        'role',
        'resource',
        'user-group',
        'login_record',
        'password_reset_code',
        'email_verification_code',
        'email_log',
        'notification_log',
      ]),
    );
  });
});
