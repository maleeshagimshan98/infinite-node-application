/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Role, NewRole } from '@/domain/auth/models/role';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { RoleMapper } from './role.mapper';
import { RoleModel } from './role.model';

import type { INewRoleSchema } from './role.model';
import type { PopulateOptions } from 'mongoose';

export class RoleRepository extends BaseRepository<INewRoleSchema, Role, NewRole> implements IRoleRepository {
  constructor() {
    super(RoleModel, new RoleMapper());
  }

  /**
   * Populate each granted resource_permissions entry's resource_id ref so callers always receive
   * a fully hydrated `resources: IResourcePermission[]` view alongside the raw `resource_ids`.
   *
   * @returns {(string | PopulateOptions)[]} Mongoose population paths/options.
   */
  protected populateOptions(): (string | PopulateOptions)[] {
    return ['resource_permissions.resource_id'];
  }
}

export default RoleRepository;
