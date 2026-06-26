/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseRepository } from '@/application/interfaces/repositories/base.repository.interface';
import type { TransactionOptions } from '@/application/interfaces';

import type mongoose from 'mongoose';
import type { Model, Document } from 'mongoose';
import type { IBaseMapper } from './base.mapper.interface';

type MongooseModel<DBModel> = Model<
  DBModel,
  object,
  object,
  object,
  Document<unknown, object, DBModel, object> &
    DBModel &
    Required<{
      _id?: string;
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

  constructor(model: MongooseModel<DBModel>, mapper: IBaseMapper<DBModel, DomainModel, NewDomainModel>) {
    this.mongooseModel = model;
    this.mapper = mapper;
  }

  /**
   * Create a new document in the database
   *
   * @param {NewDomainModel} item
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel>}
   */
  public async create(item: NewDomainModel, transactionOptions?: TransactionOptions): Promise<DomainModel> {
    const model = new this.mongooseModel(this.mapper.toPersistence(item));
    await model.save(
      transactionOptions && transactionOptions.session
        ? { session: transactionOptions.session as mongoose.mongo.ClientSession }
        : undefined,
    );
    return this.mapper.toDomain(model);
  }

  /**
   * Create multiple documents in the database
   *
   * @param {NewDomainModel[]} items
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel[]>}
   */
  public async bulkCreate(items: NewDomainModel[], transactionOptions?: TransactionOptions): Promise<DomainModel[]> {
    const models = items.map((item) => new this.mongooseModel(this.mapper.toPersistence(item)));
    await this.mongooseModel.insertMany(
      models,
      transactionOptions && transactionOptions.session
        ? { session: transactionOptions.session as mongoose.mongo.ClientSession }
        : { ordered: true, rawResult: false },
    );
    return models.map((model) => this.mapper.toDomain(model));
  }

  /**
   * Find a document by its ID
   *
   * @param {string} id
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   */
  public async findById(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null> {
    const model = await this.mongooseModel
      .findById(id)
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
  }

  /**
   * Find a single document matching the provided filter
   *
   * @param {Partial<NewDomainModel>} filter Partial new domain model fields to match documents against
   * @param {Record<string, 1 | -1>} sort Optional sort order for the document
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   */
  public async findOne(
    filter: Partial<NewDomainModel>,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel | null> {
    const dbFilter = this.mapper.toFilter(filter);
    let query = this.mongooseModel.findOne(dbFilter);

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
   */
  public async find(
    filter: Partial<NewDomainModel>,
    limit?: number,
    offset?: number,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel[]> {
    const dbFilter = this.mapper.toFilter(filter);
    let query = this.mongooseModel.find(dbFilter);

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
  }

  /**
   * Count documents matching the provided filter
   *
   * @param {Partial<NewDomainModel>} filter Partial new domain model fields to match documents against
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<number>} Resolves to the count of matching documents
   */
  public async count(filter: Partial<NewDomainModel>, transactionOptions?: TransactionOptions): Promise<number> {
    return await this.mongooseModel
      .countDocuments(this.mapper.toFilter(filter))
      .session(
        transactionOptions && transactionOptions.session
          ? (transactionOptions.session as mongoose.mongo.ClientSession)
          : null,
      )
      .exec();
  }

  /**
   * Update a document by its ID with the provided partial item data
   *
   * @param {string} id - The ID of the document to update
   * @param {NewDomainModel} item - The partial data to update the document with
   * @param {TransactionOptions | undefined} transactionOptions - Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the updated document, or null if no document with the given ID is found
   */
  public async update(
    id: string,
    item: NewDomainModel,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel | null> {
    const persistenceData = this.mapper.toPersistence(item);
    const model = await this.mongooseModel
      .findByIdAndUpdate(
        id,
        { $set: persistenceData as unknown as Record<string, unknown> },
        { new: true, runValidators: true },
      )
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
  }

  /**
   * Delete a document by its ID
   *
   * @param {string} id
   * @param {TransactionOptions | undefined} transactionOptions Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the deleted document, or null if not found
   */
  public async delete(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null> {
    const model = await this.mongooseModel
      .findByIdAndDelete(id)
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
  }
}
