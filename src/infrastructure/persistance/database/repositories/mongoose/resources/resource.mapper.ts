/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewResource } from '@/domain/auth/models/resource';
import { Resource } from '@/domain/auth/models/resource';

import { BaseMapper } from '../base/base.mapper';

import type { INewResourceSchema } from './resource.model';

export class ResourceMapper extends BaseMapper<INewResourceSchema, Resource, NewResource> {
  /**
   * Convert a persisted resource document into a Resource domain model.
   *
   * @param {INewResourceSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {Resource} The mapped domain model.
   */
  toDomain(data: INewResourceSchema & { _id: Types.ObjectId }): Resource {
    return new Resource({
      id: data._id.toString(),
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
    });
  }

  /**
   * Convert a new/updated resource domain model into its persistence schema shape.
   *
   * @param {NewResource} data - The domain model data to persist.
   * @returns {INewResourceSchema} The persistence-ready schema object.
   */
  toPersistence(data: NewResource): INewResourceSchema {
    const base = {
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
    };
    return !data.id ? base : { ...base, _id: new Types.ObjectId(data.id) };
  }
}
