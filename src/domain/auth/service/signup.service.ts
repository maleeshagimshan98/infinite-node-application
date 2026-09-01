/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { NewUser, type User } from '@/domain/user/models/user';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
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

  constructor(userRepository: IUserRepository) {
    super();
    this.userRepository = userRepository;
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
   * Register a new user. Trusts that the caller (SignupApplicationService) has already resolved
   * a valid `ug_id`/`role_id` pair — this service no longer resolves any defaults itself.
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

      const newUser = new NewUser({
        ...userData,
        password: hashedPassword,
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
        throw new DomainServiceError(`The User with the email equal to ${email} could not be found.`, 'NOT_FOUND');
      }

      if (!user.isActive()) {
        user.activate();
        const updatedUser = await this.userRepository.update(user.id, user, transactionOptions);

        if (!updatedUser) {
          throw new DomainServiceError(`The User with the id equal to ${user.id} could not be found.`, 'NOT_FOUND');
        }
      }
    });
  }
}

export default SignupService;
