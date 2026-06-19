/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import { NewCustomerGroup, type CustomerGroup } from '@/domain/user/models/customer-group';
import type { ICustomerGroupRepository } from '@/application/interfaces/repositories/customer-groups/customer-group.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { INewCustomerGroup } from '@/domain/user/models/customer-group';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

/**
 * Customer Group Service
 *
 * Handles all business logic related to customer group management including
 * creation, updates, deletion, and default group management.
 *
 * @extends BaseDomainService
 */
export class CustomerGroupService extends BaseDomainService {
  /**
   * Customer group repository instance
   *
   * @private
   */
  private readonly customerGroupRepository: ICustomerGroupRepository;

  /**
   * User repository instance (needed for validation)
   *
   * @private
   */
  private readonly userRepository: IUserRepository;

  constructor(customerGroupRepository: ICustomerGroupRepository, userRepository: IUserRepository) {
    super();
    this.customerGroupRepository = customerGroupRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get customer group by ID
   *
   * @param {string} id - Customer group ID
   * @returns {Promise<CustomerGroup | null>}
   */
  async getById(id: string): Promise<CustomerGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.customerGroupRepository.findById(id);
    });
  }

  /**
   * Get customer group by name
   *
   * @param {string} name - Customer group name
   * @returns {Promise<CustomerGroup | null>}
   */
  async getByName(name: string): Promise<CustomerGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.customerGroupRepository.findOne({ name });
    });
  }

  /**
   * Get the default customer group
   *
   * @returns {Promise<CustomerGroup | null>}
   */
  async getDefaultGroup(): Promise<CustomerGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.customerGroupRepository.findOne({ default: true });
    });
  }

  /**
   * List all customer groups
   *
   * @param {number} limit - Maximum number of groups to return (optional)
   * @param {number} offset - Number of groups to skip (optional)
   * @returns {Promise<CustomerGroup[]>}
   */
  async list(limit?: number, offset?: number): Promise<CustomerGroup[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.customerGroupRepository.find({}, limit, offset);
    });
  }

  /**
   * Create a new customer group
   *
   * @param {INewCustomerGroup} groupData - Customer group data
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<{ id: string; name: string }>}
   * @throws {DomainServiceError}
   */
  async create(
    groupData: INewCustomerGroup,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      // Check if group with same name already exists
      const existingGroup = await this.getByName(groupData.name);

      if (existingGroup) {
        throw new DomainServiceError(
          ErrorResponseMessages.RESOURCE_ALREADY_EXISTS_ERROR('Customer Group', 'name', groupData.name),
          'VALIDATION_ERROR',
        );
      }

      // If this is marked as default, ensure no other default exists
      if (groupData.default) {
        const currentDefault = await this.getDefaultGroup();
        if (currentDefault) {
          throw new DomainServiceError(
            'A default customer group already exists. Please unset the current default before creating a new one.',
            'VALIDATION_ERROR',
          );
        }
      }

      // Create new customer group
      const newGroup = new NewCustomerGroup(groupData);
      const createdGroup = await this.customerGroupRepository.create(newGroup, transactionOptions);

      return {
        id: createdGroup.id,
        name: createdGroup.name,
      };
    });
  }

  /**
   * Update an existing customer group
   *
   * @param {string} id - Customer group ID
   * @param {Partial<INewCustomerGroup>} updateData - Data to update
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<{ id: string; name: string }>}
   * @throws {DomainServiceError}
   */
  async update(
    id: string,
    updateData: Partial<INewCustomerGroup>,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      // Get existing group
      const existingGroup = await this.getById(id);

      if (!existingGroup) {
        throw new DomainServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('Customer Group', 'id', id), 'NOT_FOUND');
      }

      // If updating name, check for duplicates
      if (updateData.name && updateData.name !== existingGroup.name) {
        const duplicateGroup = await this.getByName(updateData.name);
        if (duplicateGroup) {
          throw new DomainServiceError(
            ErrorResponseMessages.RESOURCE_ALREADY_EXISTS_ERROR('Customer Group', 'name', updateData.name),
            'VALIDATION_ERROR',
          );
        }
      }

      // If setting as default, unset current default
      if (updateData.default === true) {
        const currentDefault = await this.getDefaultGroup();
        if (currentDefault && currentDefault.id !== id) {
          currentDefault.default = false;
          await this.customerGroupRepository.update(currentDefault.id, currentDefault, transactionOptions);
        }
      }

      // Update the group
      Object.assign(existingGroup, updateData);
      await this.customerGroupRepository.update(id, existingGroup, transactionOptions);

      return {
        id: existingGroup.id,
        name: existingGroup.name,
      };
    });
  }

  /**
   * Delete a customer group
   *
   * @param {string} id - Customer group ID
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<void>}
   * @throws {DomainServiceError}
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      // Get the group
      const group = await this.getById(id);

      if (!group) {
        throw new DomainServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('Customer Group', 'id', id), 'NOT_FOUND');
      }

      // Don't allow deletion of default group
      if (group.default) {
        throw new DomainServiceError(
          'Cannot delete the default customer group. Please set another group as default first.',
          'VALIDATION_ERROR',
        );
      }

      // Check if any users belong to this group
      const usersInGroup = await this.userRepository.find({ cg_id: id }, 1);

      if (usersInGroup.length > 0) {
        throw new DomainServiceError(
          'Cannot delete customer group because it has associated users. Please reassign users first.',
          'VALIDATION_ERROR',
        );
      }

      // Delete the group
      await this.customerGroupRepository.delete(id, transactionOptions);
    });
  }

  /**
   * Set a customer group as default (and unset others)
   *
   * @param {string} id - Customer group ID to set as default
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<{ id: string; name: string }>}
   * @throws {DomainServiceError}
   */
  async setAsDefault(id: string, transactionOptions?: TransactionOptions): Promise<{ id: string; name: string }> {
    return this.wrapInfrastructureErrors(async () => {
      // Get the group
      const group = await this.getById(id);

      if (!group) {
        throw new DomainServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('Customer Group', 'id', id), 'NOT_FOUND');
      }

      // If already default, nothing to do
      if (group.default) {
        return {
          id: group.id,
          name: group.name,
        };
      }

      // Unset current default
      const currentDefault = await this.getDefaultGroup();
      if (currentDefault) {
        currentDefault.default = false;
        await this.customerGroupRepository.update(currentDefault.id, currentDefault, transactionOptions);
      }

      // Set new default
      group.default = true;
      await this.customerGroupRepository.update(group.id, group, transactionOptions);

      return {
        id: group.id,
        name: group.name,
      };
    });
  }
}

export default CustomerGroupService;
