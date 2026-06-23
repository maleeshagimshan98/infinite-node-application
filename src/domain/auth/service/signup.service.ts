/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { UserGroup } from '@/domain/user/models/user-group';
import { NewUser, type User } from '@/domain/user/models/user';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { INewUser } from '@/domain/user/models/user';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

export class SignupService extends BaseDomainService {
  /**
   * User repository instance
   *
   * @private
   */
  private readonly userRepository: IUserRepository;

  /**
   * Customer group repository instance
   *
   * @private
   */
  private readonly userGroupRepository: IUserGroupRepository;

  constructor(userRepository: IUserRepository, userGroupRepository: IUserGroupRepository) {
    super();
    this.userRepository = userRepository;
    this.userGroupRepository = userGroupRepository;
  }

  /**
   * Check if user exists by email
   *
   * @param {string} email - User email
   * @returns {Promise<User | null>}
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userRepository.findOne({ email });
    });
  }

  /**
   * Get default customer group
   *
   * @returns {Promise<UserGroup | null>}
   */
  async getDefaultUserGroup(): Promise<UserGroup | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userGroupRepository.findOne({ default: true });
    });
  }

  /**
   * Register a new user
   *
   * @param {INewUser} userData - User registration data
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<{ id: string; status: string }>}
   * @throws {DomainServiceError}
   */
  async register(userData: INewUser, transactionOptions?: TransactionOptions): Promise<{ id: string; status: string }> {
    return this.wrapInfrastructureErrors(async () => {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);

      if (existingUser) {
        throw new DomainServiceError('This email is already associated with another account', 'VALIDATION_ERROR');
      }

      // Hash password
      const hashedPassword = await argon2.hash(userData.password);

      // Get default customer group
      const defaultUserGroup = await this.getDefaultUserGroup();

      if (!defaultUserGroup) {
        throw new DomainServiceError('No default customer group is available', 'UNKNOWN_ERROR');
      }
      const newUser = new NewUser({
        ...userData,
        password: hashedPassword,
        ug_id: defaultUserGroup.id,
        status: 'pending_verification',
      });

      // Create new user
      const createdUser = await this.userRepository.create(newUser, transactionOptions);

      return {
        id: createdUser.id,
        status: createdUser.status,
      };
    });
  }

  /**
   * Verify user email and activate account
   *
   * @param {string} email - User email
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<void>}
   * @throws {DomainServiceError}
   */
  async verifyEmail(email: string, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      const user: User | null = await this.getUserByEmail(email);

      if (!user) {
        throw new DomainServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'NOT_FOUND');
      }

      user.status = 'active';
      await this.userRepository.update(user.id, user, transactionOptions);
    });
  }
}

export default SignupService;
