/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Types } from 'mongoose';
import type { IBaseMapper } from './base.mapper.interface';

export abstract class BaseMapper<DBSchema, DomainModel, NewDomainModel> implements IBaseMapper<
  DBSchema,
  DomainModel,
  NewDomainModel
> {
  /**
   * Convert raw database data to a domain model instance.
   *
   * @param {DBSchema & { _id: Types.ObjectId }} data - The raw persisted data, with `_id` narrowed to required for a hydrated read.
   * @returns {DomainModel} The mapped domain model instance.
   */
  abstract toDomain(data: DBSchema & { _id: Types.ObjectId }): DomainModel;

  /**
   * Convert a domain model instance to a format suitable for persistence in the database.
   *
   * @param {NewDomainModel} data - The domain model data to convert.
   * @returns {DBSchema} The persistence-ready schema object.
   */
  abstract toPersistence(data: NewDomainModel): DBSchema;

  /**
   * Translate a partial domain-model filter into a persistence filter by reusing the persistence mapper.
   *
   * @param {Partial<NewDomainModel>} filter - Partial domain model fields used as query criteria
   * @returns {Partial<DBSchema>} Partial schema object for use in database queries
   */
  toFilter(filter: Partial<NewDomainModel>): Partial<DBSchema> {
    const persistenceFilter = this.toPersistence(filter as NewDomainModel) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(persistenceFilter).filter(([, value]) => value !== undefined),
    ) as Partial<DBSchema>;
  }
}
