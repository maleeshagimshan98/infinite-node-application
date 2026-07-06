/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { UserGroup, NewUserGroup } from '@/domain/user/models/user-group';

import type { IBaseRepository } from '../base.repository.interface';

export interface IUserGroupRepository extends IBaseRepository<UserGroup, NewUserGroup> {}

export default IUserGroupRepository;
