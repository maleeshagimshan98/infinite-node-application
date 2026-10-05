/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { NewUser, type User } from '@/domain/user/models/user';
import type { INewUser } from '@/domain/user/models/user';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

/**
 * User Service
 *
 * Handles all business logic related to user management, including creation, lookup,
 * updates, and deletion. This is the single owner of user persistence — other domain
 * services (signup, login, account recovery) delegate their user lookups/writes here
 * instead of holding their own `IUserRepository`.
 *
 * @extends BaseDomainService
 */
export class UserService extends BaseDomainService {
  private readonly userRepository: IUserRepository;
  private readonly roleRepository: IRoleRepository;
  private readonly userGroupRepository: IUserGroupRepository;

  constructor(
    userRepository: IUserRepository,
    roleRepository: IRoleRepository,
    userGroupRepository: IUserGroupRepository,
  ) {
    super();
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.userGroupRepository = userGroupRepository;
  }

  /**
   * Get a user by its id.
   *
   * @param {string} id - The user id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User>} The matching user.
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<User> {
    return this.wrapInfrastructureErrors(async () => {
      const user = await this.userRepository.findById(id, transactionOptions);
      if (!user) {
        throw new DomainServiceError(`The User with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return user;
    });
  }

  /**
   * Get a user by its email.
   *
   * @param {string} email - The user's email.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User | null>} The matching user, or null if none exists.
   */
  async getByEmail(email: string, transactionOptions?: TransactionOptions): Promise<User | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userRepository.findOne({ email }, undefined, transactionOptions);
    });
  }

  /**
   * Get all users, optionally paginated.
   *
   * @param {number} [limit] - Maximum number of users to return.
   * @param {number} [offset] - Number of users to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User[]>} The matching users.
   */
  async getAll(limit?: number, offset?: number, transactionOptions?: TransactionOptions): Promise<User[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userRepository.find({}, limit, offset, undefined, transactionOptions);
    });
  }

  /**
   * Verify that a role id and a user group id both reference existing documents.
   *
   * @param {string} roleId - The role id to verify.
   * @param {string} ugId - The user group id to verify.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} VALIDATION_ERROR when the role or the user group does not exist.
   * @throws {RepositoryError} INVALID_ID when roleId or ugId is malformed (the caller's wrapInfrastructureErrors maps it to VALIDATION_ERROR).
   */
  private async assertRoleAndGroupExist(
    roleId: string,
    ugId: string,
    transactionOptions?: TransactionOptions,
  ): Promise<void> {
    const [role, group] = await Promise.all([
      this.roleRepository.findById(roleId, transactionOptions),
      this.userGroupRepository.findById(ugId, transactionOptions),
    ]);
    if (!role) {
      throw new DomainServiceError(`The Role with the id equal to ${roleId} could not be found.`, 'VALIDATION_ERROR');
    }
    if (!group) {
      throw new DomainServiceError(
        `The User Group with the id equal to ${ugId} could not be found.`,
        'VALIDATION_ERROR',
      );
    }
  }

  /**
   * Create a new user. Hashes the plain-text password and verifies that the given role and
   * user group exist before creating.
   *
   * @param {INewUser} data - The user data.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User>} The created user.
   * @throws {DomainServiceError} ALREADY_EXISTS when the email is already associated with another account.
   * @throws {DomainServiceError} VALIDATION_ERROR when the given role_id/ug_id is malformed or does not exist.
   */
  async create(data: INewUser, transactionOptions?: TransactionOptions): Promise<User> {
    return this.wrapInfrastructureErrors(async () => {
      const existingUser = await this.getByEmail(data.email, transactionOptions);
      if (existingUser) {
        throw new DomainServiceError(
          `The User with the email equal to ${data.email} already exists.`,
          'ALREADY_EXISTS',
        );
      }

      await this.assertRoleAndGroupExist(data.role_id, data.ug_id, transactionOptions);

      const hashedPassword = await argon2.hash(data.password);
      const newUser = new NewUser({ ...data, password: hashedPassword });
      return await this.userRepository.create(newUser, transactionOptions);
    });
  }

  /**
   * Update a user by its id. Re-validates the email uniqueness and the role/user group
   * existence only when those fields are being changed, and re-hashes the password only when
   * a new one is supplied.
   *
   * @param {string} id - The user id.
   * @param {Partial<INewUser>} data - The fields to update.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User>} The updated user.
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given id.
   * @throws {DomainServiceError} ALREADY_EXISTS when renaming to an email already used by another account.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed, or the given role_id/ug_id is malformed or does not exist.
   */
  async update(id: string, data: Partial<INewUser>, transactionOptions?: TransactionOptions): Promise<User> {
    return this.wrapInfrastructureErrors(async () => {
      const existingUser = await this.getById(id, transactionOptions);

      if (data.email && data.email !== existingUser.email) {
        const duplicateUser = await this.getByEmail(data.email, transactionOptions);
        if (duplicateUser) {
          throw new DomainServiceError(
            `The User with the email equal to ${data.email} already exists.`,
            'ALREADY_EXISTS',
          );
        }
      }

      await this.assertRoleAndGroupExist(
        data.role_id ?? existingUser.role_id,
        data.ug_id ?? existingUser.ug_id,
        transactionOptions,
      );

      const updatePayload: Partial<INewUser> = { ...data };
      if (data.password) {
        updatePayload.password = await argon2.hash(data.password);
      }

      Object.assign(existingUser, updatePayload);
      const updatedUser = await this.userRepository.update(id, existingUser, transactionOptions);

      if (!updatedUser) {
        throw new DomainServiceError(`The User with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return updatedUser;
    });
  }

  /**
   * Delete a user by its id.
   *
   * @param {string} id - The user id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User>} The deleted user.
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<User> {
    return this.wrapInfrastructureErrors(async () => {
      await this.getById(id, transactionOptions);

      const deletedUser = await this.userRepository.delete(id, transactionOptions);
      if (!deletedUser) {
        throw new DomainServiceError(`The User with the id equal to ${id} could not be deleted.`, 'NOT_FOUND');
      }
      return deletedUser;
    });
  }
}

export default UserService;
