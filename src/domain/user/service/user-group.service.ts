/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { NewUserGroup, type UserGroup } from '@/domain/user/models/user-group';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { INewUserGroup } from '@/domain/user/models/user-group';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

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

  async getById(id: string): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findById(id);
    });
  }

  async getByName(name: string): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findOne({ name });
    });
  }

  async getDefaultGroup(): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findOne({ default: true });
    });
  }

  async getAll(limit?: number, offset?: number): Promise<UserGroup[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.find({}, limit, offset);
    });
  }

  async create(
    groupData: INewUserGroup,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const existingGroup = await this.getByName(groupData.name);

      if (existingGroup) {
        throw new DomainServiceError(
          `The User Group with the name equal to ${groupData.name} already exists.`,
          'VALIDATION_ERROR',
        );
      }

      if (groupData.default) {
        const currentDefault = await this.getDefaultGroup();
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

  async update(
    id: string,
    updateData: Partial<INewUserGroup>,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const existingGroup = await this.getById(id);

      if (!existingGroup) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      if (updateData.name && updateData.name !== existingGroup.name) {
        const duplicateGroup = await this.getByName(updateData.name);
        if (duplicateGroup) {
          throw new DomainServiceError(
            `The User Group with the name equal to ${updateData.name} already exists.`,
            'VALIDATION_ERROR',
          );
        }
      }

      if (updateData.default === true) {
        const currentDefault = await this.getDefaultGroup();
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

      Object.assign(existingGroup, updateData);
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
   * @throws {DomainServiceError} VALIDATION_ERROR when the group is the default group or has associated users.
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<UserGroup> {
    return this.wrapInfrastructureErrors(async () => {
      const group = await this.getById(id);

      if (!group) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      if (group.default) {
        throw new DomainServiceError(
          'Cannot delete the default user group. Please set another group as default first.',
          'VALIDATION_ERROR',
        );
      }

      const usersInGroup = await this.userRepository.find({ ug_id: id }, 1);

      if (usersInGroup.length > 0) {
        throw new DomainServiceError(
          'Cannot delete user group because it has associated users. Please reassign users first.',
          'VALIDATION_ERROR',
        );
      }

      const deletedGroup = await this.userGroupRepository.delete(id, transactionOptions);

      if (!deletedGroup) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      return deletedGroup;
    });
  }

  async setAsDefault(id: string, transactionOptions?: TransactionOptions): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const group = await this.getById(id);

      if (!group) {
        throw new DomainServiceError(`The User Group with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }

      if (group.default) {
        return {
          id: group.id,
          name: group.name,
        };
      }

      const currentDefault = await this.getDefaultGroup();
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
