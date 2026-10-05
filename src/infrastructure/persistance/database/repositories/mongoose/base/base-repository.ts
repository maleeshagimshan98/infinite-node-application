/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseRepository } from '@/application/interfaces/repositories/base.repository.interface';
import type { TransactionOptions } from '@/application/interfaces';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';
import {
  hasTransactionRetryLabel,
  isConnectionFailure,
  isDuplicateKeyError,
  isMalformedIdError,
  isMongooseDriverError,
} from '@/infrastructure/persistance/database/errors/mongoose-error.guards';
import { PersistanceError } from '@/infrastructure/persistance/database/errors/persistance.error';

import type mongoose from 'mongoose';
import type { Model, Document, Types, PopulateOptions } from 'mongoose';
import type { IBaseMapper } from './base.mapper.interface';

type MongooseModel<DBModel> = Model<
  DBModel,
  object,
  object,
  object,
  Document<unknown, object, DBModel, object> &
    DBModel &
    Required<{
      _id?: Types.ObjectId;
    }>
>;

/**
 * BaseRepository provides common CRUD operations for any schema type DBModel (model schema interface) and DomainModel (domain model).
 * It uses a Mongoose model for database interactions and a mapper to convert between persistence and domain models.
 */
export abstract class BaseRepository<DBModel, DomainModel, NewDomainModel> implements IBaseRepository<
  DomainModel,
  NewDomainModel
> {
  /**
   * mongoose model instance for the schema DBModel
   *
   * @type {DBModel}
   * @private
   */
  private mongooseModel: MongooseModel<DBModel>;

  /**
   * mapper instance to convert between domain model DomainModel and persistence model DBModel
   *
   * @type {IBaseMapper<DBModel, DomainModel, NewDomainModel>}
   * @private
   */
  private mapper: IBaseMapper<DBModel, DomainModel, NewDomainModel>;

  constructor(model: Model<DBModel>, mapper: IBaseMapper<DBModel, DomainModel, NewDomainModel>) {
    // Schema interfaces declare `_id?: Types.ObjectId` (optional — omitted on fresh creates),
    // but `DBModel` is an unconstrained generic here, so TypeScript cannot resolve Mongoose's
    // conditional hydrated-document `_id` type for it. This cast only narrows optional →
    // required `_id` for hydrated reads — the guarantee every mapper's `toDomain` relies on —
    // at the one place a raw Mongoose model enters the repository.
    this.mongooseModel = model as MongooseModel<DBModel>;
    this.mapper = mapper;
  }

  /**
   * Declare which ref-typed paths this repository's queries should populate, optionally
   * nesting one further level via Mongoose's PopulateOptions. Override in a concrete
   * repository (e.g. RoleRepository → ['resource_permissions.resource_id'], UserRepository →
   * [{ path: 'role_id', populate: { path: 'resource_permissions.resource_id' } }]). The default
   * ([]) disables population — every repository that doesn't override this (LoginRecord,
   * PasswordResetCode, UserGroup) behaves exactly as before this hook was introduced. Never nest
   * a 3rd level here — see the Population Strategy rule in CLAUDE.md/AGENTS.md.
   *
   * @returns {(string | PopulateOptions)[]} Mongoose population paths/options.
   */
  protected populateOptions(): (string | PopulateOptions)[] {
    return [];
  }

  /**
   * Run a repository operation, translating Mongoose / MongoDB failures into RepositoryError (bad caller
   * data) or InfrastructureError (the database failed). Every query method — including custom ones in
   * concrete repositories — must run through this.
   *
   * @param {string} operation - The operation name, used in the (log-only) error message.
   * @param {() => Promise<T>} fn - The operation to run, including its mapper calls.
   * @returns {Promise<T>} The resolved value of `fn` when it succeeds.
   * @throws {RepositoryError} INVALID_ID for a malformed ObjectId; DUPLICATE_KEY for a unique index violation.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other Mongoose / MongoDB failure.
   */
  protected async wrapDatabaseErrors<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      // A labelled error must escape unwrapped: withTransaction retries the callback only on the raw
      // MongoError. Anything that is not a database error (e.g. a mapper's DomainEntityError) is not ours.
      if (hasTransactionRetryLabel(err) || !(isMalformedIdError(err) || isMongooseDriverError(err))) {
        throw err;
      }
      const message = `${this.mongooseModel.modelName}.${operation} failed: ${err.message}`;
      if (isMalformedIdError(err)) {
        throw new RepositoryError(message, 'INVALID_ID', { cause: err });
      }
      if (isDuplicateKeyError(err)) {
        throw new RepositoryError(message, 'DUPLICATE_KEY', { cause: err });
      }
      if (isConnectionFailure(err, this.mongooseModel.db.readyState)) {
        throw new InfrastructureError(message, 'CONNECTION_ERROR', { cause: err });
      }
      throw new PersistanceError(message, { cause: err });
    }
  }

  /**
   * Create a new document in the database
   *
   * @param {NewDomainModel} item - The domain model data to persist
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel>}
   * @throws {RepositoryError} INVALID_ID for a malformed id in `item`; DUPLICATE_KEY for a unique index violation.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  public async create(item: NewDomainModel, transactionOptions?: TransactionOptions): Promise<DomainModel> {
    return this.wrapDatabaseErrors('create', async () => {
      const model = new this.mongooseModel(this.mapper.toPersistence(item));
      await model.save(
        transactionOptions && transactionOptions.session
          ? { session: transactionOptions.session as mongoose.mongo.ClientSession }
          : undefined,
      );
      const paths = this.populateOptions();
      if (paths.length > 0) {
        // A freshly-saved document's ref fields are still bare ObjectIds until explicitly
        // populated — this keeps create() uniformly returning populated documents, like every
        // other method on a repository that opts into population.
        await model.populate(paths);
      }
      return this.mapper.toDomain(model);
    });
  }

  /**
   * Create multiple documents in the database
   *
   * @param {NewDomainModel[]} items - The domain model data to persist
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel[]>}
   * @throws {RepositoryError} INVALID_ID for a malformed id in `items`; DUPLICATE_KEY for a unique index violation.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  public async bulkCreate(items: NewDomainModel[], transactionOptions?: TransactionOptions): Promise<DomainModel[]> {
    return this.wrapDatabaseErrors('bulkCreate', async () => {
      const models = items.map((item) => new this.mongooseModel(this.mapper.toPersistence(item)));
      await this.mongooseModel.insertMany(
        models,
        transactionOptions && transactionOptions.session
          ? { session: transactionOptions.session as mongoose.mongo.ClientSession }
          : { ordered: true, rawResult: false },
      );
      const paths = this.populateOptions();
      if (paths.length > 0) {
        await Promise.all(models.map((model) => model.populate(paths)));
      }
      return models.map((model) => this.mapper.toDomain(model));
    });
  }

  /**
   * Find a document by its ID
   *
   * @param {string} id - The ID of the document to find
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   * @throws {RepositoryError} INVALID_ID when `id` is not a valid ObjectId.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   */
  public async findById(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null> {
    return this.wrapDatabaseErrors('findById', async () => {
      let query = this.mongooseModel.findById(id);

      const paths = this.populateOptions();
      if (paths.length > 0) {
        query = query.populate(paths);
      }

      const model = await query
        .session(
          transactionOptions && transactionOptions.session
            ? (transactionOptions.session as mongoose.mongo.ClientSession)
            : null,
        )
        .exec();
      if (!model) {
        return null;
      }
      return this.mapper.toDomain(model);
    });
  }

  /**
   * Find a single document matching the provided filter
   *
   * @param {Partial<NewDomainModel>} filter Partial new domain model fields to match documents against
   * @param {Record<string, 1 | -1>} sort Optional sort order for the document
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   * @throws {RepositoryError} INVALID_ID for a malformed id in `filter`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   */
  public async findOne(
    filter: Partial<NewDomainModel>,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel | null> {
    return this.wrapDatabaseErrors('findOne', async () => {
      const dbFilter = this.mapper.toFilter(filter);
      let query = this.mongooseModel.findOne(dbFilter);

      const paths = this.populateOptions();
      if (paths.length > 0) {
        query = query.populate(paths);
      }

      if (sort) {
        query = query.sort(sort);
      }

      if (transactionOptions && transactionOptions.session) {
        query = query.session(transactionOptions.session as mongoose.mongo.ClientSession);
      }

      const model = await query.exec();
      if (!model) {
        return null;
      }
      return this.mapper.toDomain(model);
    });
  }

  /**
   * Find all documents matching the provided filter
   *
   * @param {Partial<NewDomainModel>} filter Partial new domain model fields to match documents against
   * @param {number | undefined} limit Optional maximum number of documents to return
   * @param {number | undefined} offset Optional number of documents to skip (for pagination)
   * @param {Record<string, 1 | -1> | undefined} sort Optional sort order for the documents
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel[]>} Resolves to an array of found documents
   * @throws {RepositoryError} INVALID_ID for a malformed id in `filter`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   */
  public async find(
    filter: Partial<NewDomainModel>,
    limit?: number,
    offset?: number,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel[]> {
    return this.wrapDatabaseErrors('find', async () => {
      const dbFilter = this.mapper.toFilter(filter);
      let query = this.mongooseModel.find(dbFilter);

      const paths = this.populateOptions();
      if (paths.length > 0) {
        query = query.populate(paths);
      }

      if (offset !== undefined && offset > 0) {
        query = query.skip(offset);
      }

      if (limit !== undefined && limit > 0) {
        query = query.limit(limit);
      }

      if (sort) {
        query = query.sort(sort);
      }

      if (transactionOptions && transactionOptions.session) {
        query = query.session(transactionOptions.session as mongoose.mongo.ClientSession);
      }

      const models = await query.exec();
      return models.map((model) => this.mapper.toDomain(model));
    });
  }

  /**
   * Count documents matching the provided filter
   *
   * @param {Partial<NewDomainModel>} filter Partial new domain model fields to match documents against
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<number>} Resolves to the count of matching documents
   * @throws {RepositoryError} INVALID_ID for a malformed id in `filter`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   */
  public async count(filter: Partial<NewDomainModel>, transactionOptions?: TransactionOptions): Promise<number> {
    return this.wrapDatabaseErrors('count', async () => {
      return await this.mongooseModel
        .countDocuments(this.mapper.toFilter(filter))
        .session(
          transactionOptions && transactionOptions.session
            ? (transactionOptions.session as mongoose.mongo.ClientSession)
            : null,
        )
        .exec();
    });
  }

  /**
   * Update a document by its ID with the provided partial item data
   *
   * @param {string} id - The ID of the document to update
   * @param {NewDomainModel} item - The partial data to update the document with
   * @param {TransactionOptions | undefined} transactionOptions - Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the updated document, or null if no document with the given ID is found
   * @throws {RepositoryError} INVALID_ID for a malformed `id` or id in `item`; DUPLICATE_KEY for a unique index violation.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  public async update(
    id: string,
    item: NewDomainModel,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel | null> {
    return this.wrapDatabaseErrors('update', async () => {
      const persistenceData = this.mapper.toPersistence(item);
      let query = this.mongooseModel.findByIdAndUpdate(
        id,
        { $set: persistenceData as unknown as Record<string, unknown> },
        { new: true, runValidators: true },
      );

      const paths = this.populateOptions();
      if (paths.length > 0) {
        query = query.populate(paths);
      }

      const model = await query
        .session(
          transactionOptions && transactionOptions.session
            ? (transactionOptions.session as mongoose.mongo.ClientSession)
            : null,
        )
        .exec();
      if (!model) {
        return null;
      }
      return this.mapper.toDomain(model);
    });
  }

  /**
   * Delete a document by its ID
   *
   * @param {string} id - The ID of the document to delete
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the deleted document, or null if not found
   * @throws {RepositoryError} INVALID_ID when `id` is not a valid ObjectId.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   */
  public async delete(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null> {
    return this.wrapDatabaseErrors('delete', async () => {
      let query = this.mongooseModel.findByIdAndDelete(id);

      const paths = this.populateOptions();
      if (paths.length > 0) {
        query = query.populate(paths);
      }

      const model = await query
        .session(
          transactionOptions && transactionOptions.session
            ? (transactionOptions.session as mongoose.mongo.ClientSession)
            : null,
        )
        .exec();
      if (!model) {
        return null;
      }
      return this.mapper.toDomain(model);
    });
  }
}
