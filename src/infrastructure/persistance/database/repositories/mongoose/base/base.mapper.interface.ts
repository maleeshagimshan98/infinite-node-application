/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Types } from 'mongoose';

export interface IBaseMapper<DBSchema, DomainModel> {
  /**
   * Convert raw database data to a domain model instance of type K
   *
   * @param {DBSchema} data An interface representing the raw data from the database
   * @return {DomainModel} An instance of type K representing the domain model
   */
  toDomain: (data: DBSchema & { _id: string | Types.ObjectId }) => DomainModel;

  /**
   * Convert a domain model instance of type K to a format suitable for persistence in the database
   *
   * @param {DomainModel} data An instance of type K representing the domain model
   * @return {DBSchema} A plain object representing the data to be stored in the database
   */
  toPersistence: (data: DomainModel) => DBSchema;
}
