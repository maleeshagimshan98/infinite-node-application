/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { UserGroup, NewUserGroup } from '@/domain/user/models/user-group';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { UserGroupMapper } from './user-group.mapper';
import { UserGroupModel } from './user-group.model';

import type { INewUserGroupSchema } from './user-group.model';

export class UserGroupRepository
  extends BaseRepository<INewUserGroupSchema, UserGroup, NewUserGroup>
  implements IUserGroupRepository
{
  constructor() {
    super(UserGroupModel, new UserGroupMapper());
  }
}

export default UserGroupRepository;
