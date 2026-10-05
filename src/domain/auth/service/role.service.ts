/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { NewRole, type Role } from '@/domain/auth/models/role';
import type { INewRole, INewResourcePermission } from '@/domain/auth/models/role';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import type { IResourceRepository } from '@/application/interfaces/repositories/auth/resource.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

/**
 * Role Service
 *
 * Handles all business logic related to RBAC role management including creation, updates,
 * deletion, and default role management.
 *
 * @extends BaseDomainService
 */
export class RoleService extends BaseDomainService {
  private readonly roleRepository: IRoleRepository;
  private readonly resourceRepository: IResourceRepository;
  private readonly userRepository: IUserRepository;

  constructor(
    roleRepository: IRoleRepository,
    resourceRepository: IResourceRepository,
    userRepository: IUserRepository,
  ) {
    super();
    this.roleRepository = roleRepository;
    this.resourceRepository = resourceRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get a role by its id.
   *
   * @param {string} id - The role id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role>} The matching role.
   * @throws {DomainServiceError} NOT_FOUND when no role exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<Role> {
    return this.wrapInfrastructureErrors(async () => {
      const role = await this.roleRepository.findById(id, transactionOptions);
      if (!role) {
        throw new DomainServiceError(`The Role with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return role;
    });
  }

  /**
   * Get a role by its name.
   *
   * @param {string} name - The role name.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role | null>} The matching role, or null if none exists.
   */
  async getByName(name: string, transactionOptions?: TransactionOptions): Promise<Role | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.roleRepository.findOne({ name }, undefined, transactionOptions);
    });
  }

  /**
   * Get the current default role, if one has been designated.
   *
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role | null>} The default role, or null if none is set.
   */
  async getDefaultRole(transactionOptions?: TransactionOptions): Promise<Role | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.roleRepository.findOne({ default: true }, undefined, transactionOptions);
    });
  }

  /**
   * Get all roles, optionally paginated.
   *
   * @param {number} [limit] - Maximum number of roles to return.
   * @param {number} [offset] - Number of roles to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role[]>} The matching roles.
   */
  async getAll(limit?: number, offset?: number, transactionOptions?: TransactionOptions): Promise<Role[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.roleRepository.find({}, limit, offset, undefined, transactionOptions);
    });
  }

  /**
   * Create a new role.
   *
   * @param {INewRole} data - The role data.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role>} The created role.
   * @throws {DomainServiceError} ALREADY_EXISTS when a role with the same name already exists.
   * @throws {DomainServiceError} VALIDATION_ERROR when another role is already set as default.
   * @throws {DomainServiceError} NOT_FOUND when a resource_permissions entry references a resource id
   * that does not exist.
   */
  async create(data: INewRole, transactionOptions?: TransactionOptions): Promise<Role> {
    return this.wrapInfrastructureErrors(async () => {
      const existingRole = await this.getByName(data.name, transactionOptions);
      if (existingRole) {
        throw new DomainServiceError(`The Role with the name equal to ${data.name} already exists.`, 'ALREADY_EXISTS');
      }

      if (data.default) {
        const currentDefault = await this.getDefaultRole(transactionOptions);
        if (currentDefault) {
          throw new DomainServiceError(
            'A default role already exists. Please unset the current default before creating a new one.',
            'VALIDATION_ERROR',
          );
        }
      }

      await this.validateResourcePermissions(data.resource_permissions, transactionOptions);

      return await this.roleRepository.create(new NewRole(data), transactionOptions);
    });
  }

  /**
   * Update a role by its id.
   *
   * @param {string} id - The role id.
   * @param {Partial<INewRole>} data - The fields to update.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role>} The updated role.
   * @throws {DomainServiceError} NOT_FOUND when no role exists with the given id, or a
   * resource_permissions entry references a resource id that does not exist.
   * @throws {DomainServiceError} ALREADY_EXISTS when renaming to a name already used by another role.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   */
  async update(id: string, data: Partial<INewRole>, transactionOptions?: TransactionOptions): Promise<Role> {
    return this.wrapInfrastructureErrors(async () => {
      const existingRole = await this.getById(id, transactionOptions);

      if (data.name && data.name !== existingRole.name) {
        const duplicateRole = await this.getByName(data.name, transactionOptions);
        if (duplicateRole) {
          throw new DomainServiceError(
            `The Role with the name equal to ${data.name} already exists.`,
            'ALREADY_EXISTS',
          );
        }
      }

      if (data.default === true) {
        const currentDefault = await this.getDefaultRole(transactionOptions);
        if (currentDefault && currentDefault.id !== id) {
          currentDefault.default = false;
          const unsetDefault = await this.roleRepository.update(currentDefault.id, currentDefault, transactionOptions);
          if (!unsetDefault) {
            throw new DomainServiceError(
              `The Role with the id equal to ${currentDefault.id} could not be found.`,
              'NOT_FOUND',
            );
          }
        }
      }

      if (data.resource_permissions) {
        await this.validateResourcePermissions(data.resource_permissions, transactionOptions);
      }

      Object.assign(existingRole, data);
      const updatedRole = await this.roleRepository.update(id, existingRole, transactionOptions);

      if (!updatedRole) {
        throw new DomainServiceError(`The Role with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return updatedRole;
    });
  }

  /**
   * Delete a role by its id.
   *
   * @param {string} id - The role id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Role>} The deleted role.
   * @throws {DomainServiceError} NOT_FOUND when no role exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed, the role is the default role, or it still has
   * associated users.
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<Role> {
    return this.wrapInfrastructureErrors(async () => {
      const role = await this.getById(id, transactionOptions);

      if (role.default) {
        throw new DomainServiceError(
          'Cannot delete the default role. Please set another role as default first.',
          'VALIDATION_ERROR',
        );
      }

      const usersWithRole = await this.userRepository.find(
        { role_id: id },
        1,
        undefined,
        undefined,
        transactionOptions,
      );
      if (usersWithRole.length > 0) {
        throw new DomainServiceError(
          'Cannot delete role because it has associated users. Please reassign users first.',
          'VALIDATION_ERROR',
        );
      }

      const deletedRole = await this.roleRepository.delete(id, transactionOptions);
      if (!deletedRole) {
        throw new DomainServiceError(`The Role with the id equal to ${id} could not be deleted.`, 'NOT_FOUND');
      }
      return deletedRole;
    });
  }

  /**
   * Verify that every resource_permissions entry references a resource that actually exists.
   *
   * @param {INewResourcePermission[]} entries - The resource_permissions entries to validate.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND when one or more resource ids could not be found.
   */
  private async validateResourcePermissions(
    entries: INewResourcePermission[],
    transactionOptions?: TransactionOptions,
  ): Promise<void> {
    const found = await Promise.all(
      entries.map((rp) => this.resourceRepository.findById(rp.resource_id, transactionOptions)),
    );
    const missing = entries.filter((_, i) => !found[i]).map((rp) => rp.resource_id);
    if (missing.length > 0) {
      throw new DomainServiceError(`The following Resource ids could not be found: ${missing.join(', ')}`, 'NOT_FOUND');
    }
  }
}

export default RoleService;
