/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseRepository } from '@/application/interfaces/repositories/base.repository.interface';

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
export abstract class BaseRepository<DBModel, DomainModel, NewDomainModel>
  implements IBaseRepository<DBModel, DomainModel, NewDomainModel>
{
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
   * @returns {Promise<DomainModel>}
   */
  public async create(item: NewDomainModel, session?: unknown): Promise<DomainModel> {
    const model = new this.mongooseModel(this.mapper.toPersistence(item));
    await model.save(session ? { session: session as mongoose.mongo.ClientSession } : undefined);
    return this.mapper.toDomain(model);
  }

  /**
   * Find a document by its ID
   *
   * @param {string} id
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   */
  public async findById(id: string, session?: unknown): Promise<DomainModel | null> {
    const model = await this.mongooseModel
      .findById(id)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
    if (!model) {
      return null;
    }
    return this.mapper.toDomain(model);
  }

  /**
   * Find a single document matching the provided filter
   *
   * @param {Partial<DBModel>} filter Partial filter object to match documents against
   * @param {Record<string, 1 | -1>} sort Optional sort order for the document
   * @param {mongoose.mongo.ClientSession} session Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   */
  public async findOne(
    filter: Partial<DBModel>,
    sort?: Record<string, 1 | -1>,
    session?: unknown,
  ): Promise<DomainModel | null> {
    let query = this.mongooseModel.findOne(filter);

    if (sort) {
      query = query.sort(sort);
    }

    const model = await query.session((session as mongoose.mongo.ClientSession) ?? null).exec();
    if (!model) {
      return null;
    }
    return this.mapper.toDomain(model);
  }

  /**
   * Find all documents matching the provided filter
   *
   * @param {Partial<DBModel>} filter Partial filter object to match documents against
   * @param {number} limit Optional maximum number of documents to return
   * @param {number} offset Optional number of documents to skip (for pagination)
   * @param {Record<string, 1 | -1>} sort Optional sort order for the documents
   * @param {mongoose.mongo.ClientSession} session Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel[]>} Resolves to an array of found documents
   */
  public async find(
    filter: Partial<DBModel>,
    limit?: number,
    offset?: number,
    sort?: Record<string, 1 | -1>,
    session?: unknown,
  ): Promise<DomainModel[]> {
    let query = this.mongooseModel.find(filter);

    if (offset !== undefined && offset > 0) {
      query = query.skip(offset);
    }

    if (limit !== undefined && limit > 0) {
      query = query.limit(limit);
    }

    if (sort) {
      query = query.sort(sort);
    }

    const models = await query.session((session as mongoose.mongo.ClientSession) ?? null).exec();
    return models.map((model) => this.mapper.toDomain(model));
  }

  /**
   * Count documents matching the provided filter
   *
   * @param {Partial<DBModel>} filter Partial filter object to match documents against
   * @param {mongoose.mongo.ClientSession} session Optional MongoDB session for transaction support
   * @returns {Promise<number>} Resolves to the count of matching documents
   */
  public async count(filter: Partial<DBModel>, session?: unknown): Promise<number> {
    return await this.mongooseModel
      .countDocuments(filter)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
  }

  /**
   * Update a document by its ID with the provided partial item data
   *
   * @param {string} id
   * @param {NewDomainModel} item
   * @returns {Promise<DomainModel>} Resolves to the updated document
   */
  public async update(id: string, item: NewDomainModel, session?: unknown): Promise<DomainModel> {
    const persistenceData = this.mapper.toPersistence(item);
    const model = await this.mongooseModel
      .findByIdAndUpdate(id, { $set: persistenceData as unknown as Record<string, unknown> }, { new: true })
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
    if (!model) {
      //... throw specific error class
      throw new Error('Document not found');
    }
    return this.mapper.toDomain(model);
  }

  /**
   * Delete a document by its ID
   *
   * @param {string} id
   * @returns {Promise<void>} Resolves when the document is deleted
   */
  public async delete(id: string, session?: unknown): Promise<void> {
    await this.mongooseModel
      .findByIdAndDelete(id)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
  }
}
