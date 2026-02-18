/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { CustomerGroup } from '@/domain/user/models/customer-group';
import { NewUser, type User } from '@/domain/user/models/user';
import type { UserRepository } from '@/infrastructure/persistance/database/repositories/mongoose/user/user.repository';
import type { CustomerGroupRepository } from '@/infrastructure/persistance/database/repositories/mongoose/customer-groups/customer-group.repository';
import { BaseService } from '@/domain/base/service/base.service';
import { ServiceError } from '@/domain/base/service/service.error';
import type { INewUser } from '@/domain/user/models/user';

export class SignupService extends BaseService {
  /**
   * User repository instance
   *
   * @private
   */
  private readonly userRepository: UserRepository;

  /**
   * Customer group repository instance
   *
   * @private
   */
  private readonly customerGroupRepository: CustomerGroupRepository;

  constructor(userRepository: UserRepository, customerGroupRepository: CustomerGroupRepository) {
    super();
    this.userRepository = userRepository;
    this.customerGroupRepository = customerGroupRepository;
  }

  /**
   * Check if user exists by email
   *
   * @param {string} email - User email
   * @returns {Promise<User | null>}
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ email });
  }

  /**
   * Get default customer group
   *
   * @returns {Promise<CustomerGroup | null>}
   */
  async getDefaultCustomerGroup(): Promise<CustomerGroup | null> {
    return await this.customerGroupRepository.findOne({ default: true });
  }

  /**
   * Register a new user
   *
   * @param {INewUser} userData - User registration data
   * @returns {Promise<{ id: string; status: string }>}
   * @throws {ServiceError}
   */
  async register(userData: INewUser): Promise<{ id: string; status: string }> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);

    if (existingUser) {
      throw new ServiceError('This email is already associated with another account', 'VALIDATION_ERROR');
    }

    // Hash password
    const hashedPassword = await argon2.hash(userData.password);

    // Get default customer group
    const defaultCustomerGroup = await this.getDefaultCustomerGroup();

    if (!defaultCustomerGroup) {
      throw new ServiceError('No default customer group is available', 'UNKNOWN_ERROR');
    }
    const newUser = new NewUser({
      ...userData,
      password: hashedPassword,
      cg_id: defaultCustomerGroup.id,
      status: 'pending_verification',
    });

    // Create new user
    const createdUser = await this.userRepository.create(newUser);

    return {
      id: createdUser.id,
      status: createdUser.status,
    };
  }

  /**
   * Verify user email and activate account
   *
   * @param {string} email - User email
   * @returns {Promise<void>}
   * @throws {ServiceError}
   */
  async verifyEmail(email: string): Promise<void> {
    const user: User | null = await this.getUserByEmail(email);

    if (!user) {
      throw new ServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'MODEL_NOT_FOUND');
    }

    user.status = 'active';
    await this.userRepository.update(user.id, user);
  }
}
