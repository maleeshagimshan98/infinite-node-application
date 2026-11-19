/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseSubDocumentMapper } from './base-subdocument.mapper.interface';

export abstract class BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel> implements IBaseSubDocumentMapper<
  DBSchema,
  DomainModel,
  NewDomainModel
> {
  /**
   * Convert raw sub-document data to a domain model instance.
   *
   * @param {DBSchema} data - The raw sub-document data.
   * @returns {DomainModel} The mapped domain model instance.
   * @throws {DomainEntityError} when the stored sub-document breaks a model invariant.
   */
  abstract toDomain(data: DBSchema): DomainModel;

  /**
   * Convert a domain model instance to a format suitable for persistence as a sub-document.
   *
   * @param {NewDomainModel} data - The domain model data to convert.
   * @returns {DBSchema} The persistence-ready sub-document schema object.
   * @throws {BSONError} when an id is not a valid ObjectId; the repository reports it as INVALID_ID.
   */
  abstract toPersistence(data: NewDomainModel): DBSchema;
}
