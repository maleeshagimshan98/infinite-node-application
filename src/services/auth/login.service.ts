/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { HydratedDocument } from 'mongoose';
import argon2 from 'argon2';
import { BaseService } from '../base/BaseService';
import { ServiceError } from '../base/ServiceError';
import { LoginRecord } from '../../models/auth/login-record.model';
import type { ILoginRecord } from '../../models/auth/login-record.model';
import { User } from '../../models/user/user.model';
import type { IUser } from '../../models/user/user.model';
import { ErrorResponseMessages } from '../../app/core/utils/error-response-messages';

export class LoginService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get login record from authentication token
   *
   * @param {string} token - The authentication token
   * @returns {Promise<HydratedDocument<ILoginRecord> | null>}
   */
  async getLoginRecordFromAuthToken(token: string): Promise<HydratedDocument<ILoginRecord> | null> {
    return await LoginRecord.findOne({ token });
  }

  /**
   * Get user from user ID
   *
   * @param {string} userId - The user ID
   * @returns {Promise<HydratedDocument<IUser> | null>}
   */
  async getUserById(userId: string): Promise<HydratedDocument<IUser> | null> {
    return await User.findById(userId);
  }

  /**
   * Generate a random authentication token
   *
   * @returns {string} A random token string
   */
  generateToken(): string {
    return Math.random().toString(36).substr(2);
  }

  /**
   * Validate authentication token and return user data
   *
   * @param {string} token - The authentication token
   * @returns {Promise<{ id: string; status: string }>}
   * @throws {ServiceError}
   */
  async validateToken(token: string): Promise<{ id: string; status: string }> {
    if (!token) {
      throw new ServiceError(ErrorResponseMessages.NO_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    const loginRecord = await this.getLoginRecordFromAuthToken(token);

    if (!loginRecord) {
      throw new ServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    if (loginRecord.status !== 'active') {
      throw new ServiceError(ErrorResponseMessages.EXPIRED_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    if (loginRecord.valid_till < new Date(new Date().getTime())) {
      loginRecord.status = 'expired';
      await loginRecord.save();
      throw new ServiceError(ErrorResponseMessages.EXPIRED_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    const user = await this.getUserById(loginRecord.user_id);

    if (!user) {
      throw new ServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    return {
      id: user._id.toString(),
      status: user.status,
    };
  }

  /**
   * Authenticate user and create login session
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{ id: string; status: string; token: string }>}
   * @throws {ServiceError}
   */
  async login(email: string, password: string): Promise<{ id: string; status: string; token: string }> {
    const user = await User.findOne({ email }).exec();

    if (!user) {
      throw new ServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
    }

    const isPasswordMatching = await argon2.verify(user.password, password);
    if (!isPasswordMatching) {
      throw new ServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
    }

    const token = this.generateToken();

    const loginRecord = new LoginRecord({
      user_id: user._id,
      token,
      valid_till: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 1 day
      status: 'active',
    });

    await loginRecord.save();

    return {
      id: user._id.toString(),
      status: user.status,
      token,
    };
  }

  /**
   * Logout user by invalidating authentication token
   *
   * @param {string} token - The authentication token
   * @returns {Promise<void>}
   * @throws {ServiceError}
   */
  async logout(token: string): Promise<void> {
    if (!token) {
      throw new ServiceError(ErrorResponseMessages.NO_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    const loginRecord = await this.getLoginRecordFromAuthToken(token);

    if (!loginRecord) {
      throw new ServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    loginRecord.status = 'cancelled';
    await loginRecord.save();
  }
}
