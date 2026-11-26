/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { UserGroupService } from '@/domain/user/service/user-group.service';
import type { INewUserGroup } from '@/domain/user/models/user-group';
import type { IDatabaseMapper } from '@/application/interfaces';

import { BaseApplicationService } from '../base/base.application.service';

/**
 * Runs user group updates and default switches in one transaction, so making a group the default (unset the old
 * default, then set the new one) either changes both groups or neither, and a group is always the default.
 *
 * @extends BaseApplicationService
 */
export class UserGroupApplicationService extends BaseApplicationService {
  private userGroupService: UserGroupService;

  constructor(database_mapper: IDatabaseMapper, userGroupService: UserGroupService) {
    super(database_mapper);
    this.userGroupService = userGroupService;
  }

  /**
   * Update a user group by its id, in one transaction.
   *
   * @param {string} id - The ID of the user group to update.
   * @param {Partial<INewUserGroup>} updateData - The fields to update, and the `version` of the user group the caller
   * read.
   * @returns {Promise<{ id: string; name: string }>} The updated user group's id and name.
   * @throws {DomainServiceError} NOT_FOUND when no user group exists with the given id, or the current default group
   * could not be unset.
   * @throws {DomainServiceError} CONFLICT when `updateData.version` is not the group's current version, or the group or
   * the current default group changed during the update.
   * @throws {DomainServiceError} INVALID_OPERATION when `updateData.default` is false and the group is the default
   * group.
   * @throws {DomainServiceError} ALREADY_EXISTS when another user group already has the requested name.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached while running or committing
   * the transaction.
   * @throws {PersistanceError} when the database otherwise fails while running, committing or aborting the
   * transaction.
   */
  async update(id: string, updateData: Partial<INewUserGroup>): Promise<{ id: string; name: string }> {
    return await this.dbTransaction(async ({ session }) => {
      return await this.userGroupService.update(id, updateData, { session });
    });
  }

  /**
   * Make a user group the default, unsetting the current default group, in one transaction.
   *
   * @param {string} id - The ID of the user group to set as default.
   * @returns {Promise<{ id: string; name: string }>} The (now default) user group's id and name.
   * @throws {DomainServiceError} NOT_FOUND when no user group exists with the given id, or the current default group
   * could not be unset.
   * @throws {DomainServiceError} CONFLICT when the group or the current default group changed during the switch.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached while running or committing
   * the transaction.
   * @throws {PersistanceError} when the database otherwise fails while running, committing or aborting the
   * transaction.
   */
  async setAsDefault(id: string): Promise<{ id: string; name: string }> {
    return await this.dbTransaction(async ({ session }) => {
      return await this.userGroupService.setAsDefault(id, { session });
    });
  }
}

export default UserGroupApplicationService;
