/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { User } from '@/domain/user/models/user.model';
import type { INewUser } from '@/domain/user/models/user.model';

import type { IBaseMapper } from '../base/base.mapper.interface';

export class UserMapper implements IBaseMapper<INewUser, User> {
  toDomain(data: INewUser): User {
    return new User(data);
  }

  toPersistence(data: INewUser): INewUser {
    return {
      _id: data._id,
      email: data.email,
      password: data.password,
      status: data.status,
      cg_id: data.cg_id,
    };
  }
}
