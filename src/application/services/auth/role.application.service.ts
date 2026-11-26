/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RoleService } from '@/domain/auth/service/role.service';
import type { INewRole, Role } from '@/domain/auth/models/role';
import type { IDatabaseMapper } from '@/application/interfaces';

import { BaseApplicationService } from '../base/base.application.service';

/**
 * Runs role updates in one transaction, so making a role the default (unset the old default, then set the new one)
 * either changes both roles or neither, and a role is always the default.
 *
 * @extends BaseApplicationService
 */
export class RoleApplicationService extends BaseApplicationService {
  private roleService: RoleService;

  constructor(database_mapper: IDatabaseMapper, roleService: RoleService) {
    super(database_mapper);
    this.roleService = roleService;
  }

  /**
   * Update a role by its id, in one transaction.
   *
   * @param {string} id - The role id.
   * @param {Partial<INewRole>} data - The fields to update, and the `version` of the role the caller read.
   * @returns {Promise<Role>} The updated role, with its new version.
   * @throws {DomainServiceError} NOT_FOUND when no role exists with the given id, or a resource_permissions entry
   * references a resource id that does not exist.
   * @throws {DomainServiceError} CONFLICT when `data.version` is not the role's current version, or the role or the
   * current default role changed during the update.
   * @throws {DomainServiceError} INVALID_OPERATION when `data.default` is false and the role is the default role.
   * @throws {DomainServiceError} ALREADY_EXISTS when renaming to a name already used by another role.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached while running or committing
   * the transaction.
   * @throws {PersistanceError} when the database otherwise fails while running, committing or aborting the
   * transaction.
   */
  async update(id: string, data: Partial<INewRole>): Promise<Role> {
    return await this.dbTransaction(async ({ session }) => {
      return await this.roleService.update(id, data, { session });
    });
  }
}

export default RoleApplicationService;
