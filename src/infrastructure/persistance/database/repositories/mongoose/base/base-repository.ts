/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseRepository } from '@/application/interfaces/repositories/base.repository.interface';

import type mongoose from 'mongoose';
import type { Model } from 'mongoose';
import type { IBaseMapper } from './base.mapper.interface';

/**
 * BaseRepository provides common CRUD operations for any schema type T (model schema interface) and L (domain model).
 * It uses a Mongoose model for database interactions and a mapper to convert between persistence and domain models.
 */
export abstract class BaseRepository<T, L> implements IBaseRepository<T, L> {
  /**
   * mongoose model instance for the schema T
   *
   * @type {Model<T>}
   * @private
   */
  private model: Model<T>;

  /**
   * mapper instance to convert between domain model L and persistence model T
   *
   * @type {IBaseMapper<T, L>}
   * @private
   */
  private mapper: IBaseMapper<T, L>;

  constructor(model: Model<T>, mapper: IBaseMapper<T, L>) {
    this.model = model;
    this.mapper = mapper;
  }

  /**
   * Create a new document in the database
   *
   * @param {T} item
   * @returns {Promise<L>}
   */
  public async create(item: T, session?: unknown): Promise<L> {
    const model = new this.model(item);
    const saved = await model.save(session ? { session: session as mongoose.mongo.ClientSession } : undefined);
    return this.mapper.toDomain(saved.toObject());
  }

  /**
   * Find a document by its ID
   *
   * @param {string} id
   * @returns {Promise<L | null>} Resolves to the found document or null if not found
   */
  public async findById(id: string, session?: unknown): Promise<L | null> {
    const model = await this.model
      .findById(id)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
    if (!model) {
      return null;
    }
    return this.mapper.toDomain(model.toObject());
  }

  /**
   * Find a single document matching the provided filter
   *
   * @param {Partial<T>} filter Partial filter object to match documents against
   * @param {mongoose.mongo.ClientSession} session Optional MongoDB session for transaction support
   * @returns {Promise<L | null>} Resolves to the found document or null if not found
   */
  public async findOne(filter: Partial<T>, session?: unknown): Promise<L | null> {
    const model = await this.model
      .findOne(filter)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
    if (!model) {
      return null;
    }
    return this.mapper.toDomain(model.toObject());
  }

  /**
   * Update a document by its ID with the provided partial item data
   *
   * @param {string} id
   * @param {Partial<T>} item
   * @returns {Promise<L>} Resolves to the updated document
   */
  public async update(id: string, item: Partial<T>, session?: unknown): Promise<L> {
    const model = await this.model
      .findByIdAndUpdate(id, item, { new: true })
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
    if (!model) {
      //... throw specific error class
      throw new Error('Document not found');
    }
    return this.mapper.toDomain(model.toObject());
  }

  /**
   * Delete a document by its ID
   *
   * @param {string} id
   * @returns {Promise<void>} Resolves when the document is deleted
   */
  public async delete(id: string, session?: unknown): Promise<void> {
    await this.model
      .findByIdAndDelete(id)
      .session((session as mongoose.mongo.ClientSession) ?? null)
      .exec();
  }
}
