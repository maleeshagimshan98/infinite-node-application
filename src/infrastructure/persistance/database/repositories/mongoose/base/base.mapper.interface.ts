/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Types } from 'mongoose';

export interface IBaseMapper<DBSchema, DomainModel, NewDomainModel> {
  /**
   * Convert raw database data to a domain model instance of type DomainModel
   *
   * @param {DBSchema} data An interface representing the raw data from the database
   * @return {DomainModel} An instance of type DomainModel representing the domain model
   */
  toDomain: (data: DBSchema & { _id: string | Types.ObjectId }) => DomainModel;

  /**
   * Convert a domain model instance of type K to a format suitable for persistence in the database
   *
   * @param {NewDomainModel} data An instance of type NewDomainModel representing the domain model
   * @return {DBSchema} A plain object representing the data to be stored in the database
   */
  toPersistence: (data: NewDomainModel) => DBSchema;
}
