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
  abstract toDomain(data: DBSchema & { _id: string | Types.ObjectId }): DomainModel;
  abstract toPersistence(data: NewDomainModel): DBSchema;

  toFilter(filter: Partial<NewDomainModel>): Partial<DBSchema> {
    const { id, ...rest } = filter as Record<string, unknown>;
    const result: Partial<DBSchema> = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Partial<DBSchema>;
    if (id !== undefined) (result as Record<string, unknown>)._id = id;
    return result;
  }
}
