/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { NewUserGroup, type UserGroup } from '@/domain/user/models/user-group';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { INewUserGroup } from '@/domain/user/models/user-group';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

/**
 * User Group Service
 *
 * Handles all business logic related to user group management including
 * creation, updates, deletion, and default group management.
 *
 * @extends BaseDomainService
 */
export class UserGroupService extends BaseDomainService {
  private readonly userGroupRepository: IUserGroupRepository;
  private readonly userRepository: IUserRepository;

  constructor(userGroupRepository: IUserGroupRepository, userRepository: IUserRepository) {
    super();
    this.userGroupRepository = userGroupRepository;
    this.userRepository = userRepository;
  }

  /**
   * Fetch a user group by its ID.
   *
   * @param {string} id - The ID of the user group to retrieve.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<UserGroup | null>} The user group, or null if none matched.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findById(id, transactionOptions);
    });
  }

  /**
   * Fetch a user group by its name.
   *
   * @param {string} name - The name of the user group to retrieve.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<UserGroup | null>} The user group, or null if none matched.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getByName(name: string, transactionOptions?: TransactionOptions): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findOne({ name }, undefined, transactionOptions);
    });
  }

  /**
   * Fetch the user group currently marked as default.
   *
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<UserGroup | null>} The default user group, or null if none is set.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getDefaultGroup(transactionOptions?: TransactionOptions): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findOne({ default: true }, undefined, transactionOptions);
    });
  }

  /**
   * Fetch a page of user groups.
   *
   * @param {number} [limit] - Maximum number of user groups to return.
   * @param {number} [offset] - Number of user groups to skip.
   * @returns {Promise<UserGroup[]>} The matching user groups.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getAll(limit?: number, offset?: number): Promise<UserGroup[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.find({}, limit, offset);
    });
  }

  /**
   * Create a new user group.
   *
   * @param {INewUserGroup} groupData - The data for the new user group.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<{ id: string; name: string }>} The created user group's id and name.
   * @throws {DomainServiceError} ALREADY_EXISTS when a group with the same name already exists.
   * @throws {DomainServiceError} VALIDATION_ERROR when a default group already exists and `groupData.default` is true.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async create(
    groupData: INewUserGroup,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const existingGroup = await this.getByName(groupData.name, transactionOptions);

      if (existingGroup) {
        throw new DomainServiceError(
          `The User Group with the name equal to ${groupData.name} already exists.`,
          'ALREADY_EXISTS',
        );
      }

      if (groupData.default) {
        const currentDefault = await this.getDefaultGroup(transactionOptions);
        if (currentDefault) {
          throw new DomainServiceError(
            'A default user group already exists. Please unset the current default before creating a new one.',
            'VALIDATION_ERROR',
          );
        }
      }

      const newGroup = new NewUserGroup(groupData);
      const createdGroup = await this.userGroupRepository.create(newGroup, transactionOptions);

      return {
        id: createdGroup.id,
        name: createdGroup.name,
      };
    });
  }

  /**
   * Update an existing user group. Making the group the default writes twice (the old default is unset first, then
   * this group is set), so a caller that changes `default` passes the session of a transaction, which
   * `UserGroupApplicationService.update()` opens.
   *
   * @param {string} id - The ID of the user group to update.
   * @param {Partial<INewUserGroup>} updateData - The fields to update, and the `version` of the user group the caller
   * read. Without a version the update applies to the group as it is read here.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<{ id: string; name: string }>} The updated user group's id and name.
   * @throws {DomainServiceError} NOT_FOUND when no user group exists with the given id, or the current default group could not be unset.
   * @throws {DomainServiceError} CONFLICT when `updateData.version` is not the group's current version (checked before
   * any write), or the group or the current default group changed during the update.
   * @throws {DomainServiceError} INVALID_OPERATION when `updateData.default` is false and the group is the default
   * group: a default is unset only by making another group the default.
   * @throws {DomainServiceError} ALREADY_EXISTS when another user group already has the requested name.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async update(
    id: string,
    updateData: Partial<INewUserGroup>,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      // `version` is the version the caller read, not a field to change: it has no setter, so Object.assign() would
      // throw a TypeError on it.
      const { version, ...changes } = updateData;
      const existingGroup = await this.getById(id, transactionOptions);

      if (!existingGroup) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      this.assertVersion(existingGroup, version, 'User Group');

      if (changes.default === false && existingGroup.default) {
        throw new DomainServiceError(
          'The default user group cannot be unset. Make another group the default instead.',
          'INVALID_OPERATION',
        );
      }

      if (changes.name && changes.name !== existingGroup.name) {
        const duplicateGroup = await this.getByName(changes.name, transactionOptions);
        if (duplicateGroup) {
          throw new DomainServiceError(
            `The User Group with the name equal to ${changes.name} already exists.`,
            'ALREADY_EXISTS',
          );
        }
      }

      if (changes.default === true) {
        const currentDefault = await this.getDefaultGroup(transactionOptions);
        if (currentDefault && currentDefault.id !== id) {
          currentDefault.default = false;
          const unsetDefault = await this.userGroupRepository.update(
            currentDefault.id,
            currentDefault,
            transactionOptions,
          );
          if (!unsetDefault) {
            throw new DomainServiceError(
              `The User Group with the id equal to ${currentDefault.id} could not be found.`,
              'NOT_FOUND',
            );
          }
        }
      }

      Object.assign(existingGroup, changes);
      const updatedGroup = await this.userGroupRepository.update(id, existingGroup, transactionOptions);

      if (!updatedGroup) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      return {
        id: updatedGroup.id,
        name: updatedGroup.name,
      };
    });
  }

  /**
   * Delete a user group by its ID.
   *
   * @param {string} id - The ID of the user group to delete.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<UserGroup>} The deleted user group.
   * @throws {DomainServiceError} NOT_FOUND when no user group exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed, or the group is the default group or has associated users.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<UserGroup> {
    return this.wrapInfrastructureErrors(async () => {
      const group = await this.getById(id, transactionOptions);

      if (!group) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      if (group.default) {
        throw new DomainServiceError(
          'Cannot delete the default user group. Please set another group as default first.',
          'VALIDATION_ERROR',
        );
      }

      const usersInGroup = await this.userRepository.find({ ug_id: id }, 1, undefined, undefined, transactionOptions);

      if (usersInGroup.length > 0) {
        throw new DomainServiceError(
          'Cannot delete user group because it has associated users. Please reassign users first.',
          'VALIDATION_ERROR',
        );
      }

      const deletedGroup = await this.userGroupRepository.delete(id, transactionOptions);

      if (!deletedGroup) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be deleted.`, 'NOT_FOUND');
      }

      return deletedGroup;
    });
  }

  /**
   * Set a user group as the default, unsetting the current default group if one exists. The two writes must succeed
   * together, so the caller passes the session of a transaction, which `UserGroupApplicationService.setAsDefault()`
   * opens.
   *
   * @param {string} id - The ID of the user group to set as default.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<{ id: string; name: string }>} The (now default) user group's id and name.
   * @throws {DomainServiceError} NOT_FOUND when no user group exists with the given id, or the current default group could not be unset.
   * @throws {DomainServiceError} CONFLICT when the group or the current default group changed during the switch.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async setAsDefault(id: string, transactionOptions?: TransactionOptions): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const group = await this.getById(id, transactionOptions);

      if (!group) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      if (group.default) {
        return {
          id: group.id,
          name: group.name,
        };
      }

      const currentDefault = await this.getDefaultGroup(transactionOptions);
      if (currentDefault) {
        currentDefault.default = false;
        const unsetDefault = await this.userGroupRepository.update(
          currentDefault.id,
          currentDefault,
          transactionOptions,
        );
        if (!unsetDefault) {
          throw new DomainServiceError(
            `The User Group with the id equal to ${currentDefault.id} could not be found.`,
            'NOT_FOUND',
          );
        }
      }

      group.default = true;
      const updatedGroup = await this.userGroupRepository.update(group.id, group, transactionOptions);

      if (!updatedGroup) {
        throw new DomainServiceError(
          `The User Group with the id equal to ${group.id} could not be found.`,
          'NOT_FOUND',
        );
      }

      return {
        id: updatedGroup.id,
        name: updatedGroup.name,
      };
    });
  }
}

export default UserGroupService;
