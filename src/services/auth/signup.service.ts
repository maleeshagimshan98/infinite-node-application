/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { HydratedDocument } from 'mongoose';
import argon2 from 'argon2';
import { BaseService } from '../base/BaseService';
import { ServiceError } from '../base/ServiceError';
import { User } from '../../models/user/user.model';
import type { INewUser, IUser } from '../../models/user/user.model';
import type { ICustomerGroup } from '../../models/user/customer-group.model';
import { CustomerGroup } from '../../models/user/customer-group.model';
import { ErrorResponseMessages } from '../../app/utils/error-response-messages';

export class SignupService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Check if user exists by email
   *
   * @param {string} email - User email
   * @returns {Promise<HydratedDocument<IUser> | null>}
   */
  async getUserByEmail(email: string): Promise<HydratedDocument<IUser> | null> {
    return await User.findOne({ email }).exec();
  }

  /**
   * Get default customer group
   *
   * @returns {Promise<HydratedDocument<ICustomerGroup> | null>}
   */
  async getDefaultCustomerGroup(): Promise<HydratedDocument<ICustomerGroup> | null> {
    return await CustomerGroup.findOne({ default: true });
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

    // Create new user
    const newUser = new User({
      ...userData,
      password: hashedPassword,
      cg_id: defaultCustomerGroup._id.toString(),
      status: 'pending_verification',
    });

    await newUser.save();

    return {
      id: newUser._id.toString(),
      status: newUser.status,
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
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new ServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'MODEL_NOT_FOUND');
    }

    user.status = 'active';
    await user.save();
  }
}
