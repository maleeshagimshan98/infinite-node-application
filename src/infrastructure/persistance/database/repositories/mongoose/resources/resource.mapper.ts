/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewResource } from '@/domain/auth/models/resource';
import { Resource } from '@/domain/auth/models/resource';

import { BaseMapper } from '../base/base.mapper';

import type { INewResourceSchema } from './resource.model';

export class ResourceMapper extends BaseMapper<INewResourceSchema, Resource, NewResource> {
  toDomain(data: INewResourceSchema & { _id: Types.ObjectId }): Resource {
    return new Resource({
      id: data._id.toString(),
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
    });
  }

  toPersistence(data: NewResource): INewResourceSchema {
    const base = {
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
    };
    return !data.id ? base : { ...base, _id: new Types.ObjectId(data.id) };
  }
}
