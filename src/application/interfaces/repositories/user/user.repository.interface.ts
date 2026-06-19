/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { User, NewUser } from '@/domain/user/models/user';

import type { IBaseRepository } from '../base.repository.interface';

export interface IUserRepository extends IBaseRepository<User, NewUser> {}

export default IUserRepository;
