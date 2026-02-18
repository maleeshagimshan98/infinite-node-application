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
 * BaseRepository provides common CRUD operations for any schema type T (model schema interface) and K (domain model).
 * It uses a Mongoose model for database interactions and a mapper to convert between persistence and domain models.
 */
export abstract class BaseRepository<DBModel, DomainModel> implements IBaseRepository<DBModel, DomainModel> {
  /**
   * mongoose model instance for the schema T
   *
   * @type {DBModel}
   * @private
   */
  private mongooseModel: MongooseModel<DBModel>;

  /**
   * mapper instance to convert between domain model K and persistence model T
   *
   * @type {IBaseMapper<DBModel, DomainModel>}
   * @private
   */
  private mapper: IBaseMapper<DBModel, DomainModel>;

  constructor(model: MongooseModel<DBModel>, mapper: IBaseMapper<DBModel, DomainModel>) {
    this.mongooseModel = model;
    this.mapper = mapper;
  }

  /**
   * Create a new document in the database
   *
   * @param {DomainModel} item
   * @returns {Promise<DomainModel>}
   */
  public async create(item: DomainModel, session?: unknown): Promise<DomainModel> {
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
   * @param {mongoose.mongo.ClientSession} session Optional MongoDB session for transaction support
   * @returns {Promise<DomainModel | null>} Resolves to the found document or null if not found
   */
  public async findOne(filter: Partial<DBModel>, session?: unknown): Promise<DomainModel | null> {
    const model = await this.mongooseModel
      .findOne(filter)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
    if (!model) {
      return null;
    }
    return this.mapper.toDomain(model);
  }

  /**
   * Update a document by its ID with the provided partial item data
   *
   * @param {string} id
   * @param {DomainModel} item
   * @returns {Promise<DomainModel>} Resolves to the updated document
   */
  public async update(id: string, item: DomainModel, session?: unknown): Promise<DomainModel> {
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
