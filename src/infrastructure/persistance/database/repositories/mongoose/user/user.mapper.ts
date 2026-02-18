/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { User } from '@/domain/user/models/user';

import type { IBaseMapper } from '../base/base.mapper.interface';
import type { INewUserSchema } from './user.model';

export class UserMapper implements IBaseMapper<INewUserSchema, User> {
  toDomain(data: INewUserSchema & { _id: string }): User {
    return new User({
      id: data._id,
      email: data.email,
      password: data.password,
      status: data.status,
      cg_id: data.cg_id,
    });
  }

  toPersistence(data: User): INewUserSchema {
    return {
      _id: data.id,
      email: data.email,
      password: data.password,
      status: data.status,
      cg_id: data.cg_id,
    };
  }
}
