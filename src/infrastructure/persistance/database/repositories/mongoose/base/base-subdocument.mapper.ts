/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseSubDocumentMapper } from './base-subdocument.mapper.interface';

export abstract class BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel> implements IBaseSubDocumentMapper<
  DBSchema,
  DomainModel,
  NewDomainModel
> {
  abstract toDomain(data: DBSchema): DomainModel;
  abstract toPersistence(data: NewDomainModel): DBSchema;
}
