/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INewUser, User } from '@/domain/user/models/user.model';

import { BaseRepository } from '../base/base-repository';
import { UserMapper } from './user.mapper';

import type mongoose from 'mongoose';

export class UserRepository extends BaseRepository<INewUser, User> {
  constructor(userModel: mongoose.Model<INewUser>) {
    super(userModel, new UserMapper());
  }
}
