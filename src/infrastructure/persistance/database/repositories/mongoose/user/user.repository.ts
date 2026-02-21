/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { User, NewUser } from '@/domain/user/models/user';

import { BaseRepository } from '../base/base-repository';
import { UserMapper } from './user.mapper';
import { UserModel } from './user.model';

import type { INewUserSchema } from './user.model';

export class UserRepository extends BaseRepository<INewUserSchema, User, NewUser> {
  constructor() {
    super(UserModel, new UserMapper());
  }
}

export default UserRepository;
