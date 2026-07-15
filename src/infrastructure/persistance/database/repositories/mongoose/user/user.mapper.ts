/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { NewUser } from '@/domain/user/models/user';
import { User } from '@/domain/user/models/user';

import { BaseMapper } from '../base/base.mapper';

import type { Types } from 'mongoose';
import type { INewUserSchema } from './user.model';

export class UserMapper extends BaseMapper<INewUserSchema, User, NewUser> {
  toDomain(data: INewUserSchema & { _id: Types.ObjectId }): User {
    return new User({
      id: data._id.toString(),
      email: data.email,
      password: data.password,
      status: data.status,
      ug_id: data.ug_id,
    });
  }

  toPersistence(data: NewUser): INewUserSchema {
    return !data.id
      ? {
          email: data.email,
          password: data.password,
          status: data.status,
          ug_id: data.ug_id,
        }
      : {
          _id: data.id,
          email: data.email,
          password: data.password,
          status: data.status,
          ug_id: data.ug_id,
        };
  }
}
