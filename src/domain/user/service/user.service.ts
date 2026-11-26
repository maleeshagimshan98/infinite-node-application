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
import { normalizeEmail } from '@/domain/base/normalize-email';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

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
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
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
   * Get a user by its email. The email is matched trimmed and in lowercase, as it is stored.
   *
   * @param {string} email - The user's email, in any case.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User | null>} The matching user, or null if none exists.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getByEmail(email: string, transactionOptions?: TransactionOptions): Promise<User | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userRepository.findOne({ email: normalizeEmail(email) }, undefined, transactionOptions);
    });
  }

  /**
   * Get all users, optionally paginated.
   *
   * @param {number} [limit] - Maximum number of users to return.
   * @param {number} [offset] - Number of users to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User[]>} The matching users.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
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
    // One lookup at a time: parallel operations on one transaction's session are undefined behaviour in Mongoose.
    const role = await this.roleRepository.findById(roleId, transactionOptions);
    const group = await this.userGroupRepository.findById(ugId, transactionOptions);
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
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {Error} when argon2 cannot hash the password.
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
   * @param {Partial<INewUser>} data - The fields to update, and the `version` of the user the caller read. Without a
   * version (internal callers such as signup and account recovery) the update applies to the user as it is read here.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User>} The updated user, with its new version.
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given id.
   * @throws {DomainServiceError} CONFLICT when `data.version` is not the user's current version, or the user changed
   * during the update.
   * @throws {DomainServiceError} ALREADY_EXISTS when renaming to an email already used by another account.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed, or the given role_id/ug_id is malformed or does not exist.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {Error} when argon2 cannot hash a new password.
   */
  async update(id: string, data: Partial<INewUser>, transactionOptions?: TransactionOptions): Promise<User> {
    return this.wrapInfrastructureErrors(async () => {
      // `version` is the version the caller read, not a field to change: it has no setter, so Object.assign() would
      // throw a TypeError on it.
      const { version, ...changes } = data;
      const existingUser = await this.getById(id, transactionOptions);
      this.assertVersion(existingUser, version, 'User');

      if (changes.email !== undefined && normalizeEmail(changes.email) !== existingUser.email) {
        const duplicateUser = await this.getByEmail(changes.email, transactionOptions);
        if (duplicateUser) {
          throw new DomainServiceError(
            `The User with the email equal to ${changes.email} already exists.`,
            'ALREADY_EXISTS',
          );
        }
      }

      await this.assertRoleAndGroupExist(
        changes.role_id ?? existingUser.role_id,
        changes.ug_id ?? existingUser.ug_id,
        transactionOptions,
      );

      const updatePayload: Omit<Partial<INewUser>, 'version'> = { ...changes };
      if (changes.password) {
        updatePayload.password = await argon2.hash(changes.password);
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
   * Delete a user by its id. The delete is conditional on the version read here, so a user changed since is not
   * deleted.
   *
   * @param {string} id - The user id.
   * @param {number} [version] - The version of the user the caller read. Without a version the delete applies to the
   * user as it is read here.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<User>} The deleted user.
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given id.
   * @throws {DomainServiceError} CONFLICT when `version` is not the user's current version, or the user changed before
   * it was deleted.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async delete(id: string, version?: number, transactionOptions?: TransactionOptions): Promise<User> {
    return this.wrapInfrastructureErrors(async () => {
      const user = await this.getById(id, transactionOptions);
      this.assertVersion(user, version, 'User');

      const deletedUser = await this.userRepository.delete(id, user.version, transactionOptions);
      if (!deletedUser) {
        throw new DomainServiceError(`The User with the id equal to ${id} could not be deleted.`, 'NOT_FOUND');
      }
      return deletedUser;
    });
  }
}

export default UserService;
