/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewUserGroup } from '@/domain/user/models/user-group';
import { UserGroup } from '@/domain/user/models/user-group';

import { BaseMapper } from '../base/base.mapper';

import type { INewUserGroupSchema } from './user-group.model';

export class UserGroupMapper extends BaseMapper<INewUserGroupSchema, UserGroup, NewUserGroup> {
  toDomain(data: INewUserGroupSchema & { _id: Types.ObjectId }): UserGroup {
    return new UserGroup({
      id: data._id.toString(),
      name: data.name,
      description: data.description,
      discount: data.discount,
      default: data.default,
    });
  }

  toPersistence(data: NewUserGroup): INewUserGroupSchema {
    return !data.id
      ? {
          name: data.name,
          description: data.description,
          discount: data.discount,
          default: data.default,
        }
      : {
          _id: new Types.ObjectId(data.id),
          name: data.name,
          description: data.description,
          discount: data.discount,
          default: data.default,
        };
  }
}
