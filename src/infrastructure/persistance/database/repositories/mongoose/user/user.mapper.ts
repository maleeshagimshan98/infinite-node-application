/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { NewUser } from '@/domain/user/models/user';
import { User } from '@/domain/user/models/user';

import type { IBaseMapper } from '../base/base.mapper.interface';
import type { INewUserSchema } from './user.model';

export class UserMapper implements IBaseMapper<INewUserSchema, User, NewUser> {
  toDomain(data: INewUserSchema & { _id: string }): User {
    return new User({
      id: data._id,
      email: data.email,
      password: data.password,
      status: data.status,
      cg_id: data.cg_id,
    });
  }

  toPersistence(data: NewUser): INewUserSchema {
    return !data.id
      ? {
          email: data.email,
          password: data.password,
          status: data.status,
          cg_id: data.cg_id,
        }
      : {
          _id: data.id,
          email: data.email,
          password: data.password,
          status: data.status,
          cg_id: data.cg_id,
        };
  }
}
