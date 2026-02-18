/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { BaseService } from '@/domain/base/service/base.service';
import { ServiceError } from '@/domain/base/service/service.error';
import { NewLoginRecord, type LoginRecord } from '@/domain/auth/models/login-record';
import type { User } from '@/domain/user/models/user';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { UserRepository } from '@/infrastructure/persistance/database/repositories/mongoose/user/user.repository';
import type { LoginRecordRepository } from '@/infrastructure/persistance/database/repositories/mongoose/auth/login-record.repository';

export class LoginService extends BaseService {
  private userRepository: UserRepository;
  private loginRecordRepository: LoginRecordRepository;

  constructor(userRepository: UserRepository, loginRecordRepository: LoginRecordRepository) {
    super();
    this.userRepository = userRepository;
    this.loginRecordRepository = loginRecordRepository;
  }

  /**
   * Get login record from authentication token
   *
   * @param {string} token - The authentication token
   * @returns {Promise<LoginRecord | null>}
   */
  async getLoginRecordFromAuthToken(token: string): Promise<LoginRecord | null> {
    return await this.loginRecordRepository.findOne({ token });
  }

  /**
   * Get user from user ID
   *
   * @param {string} userId - The user ID
   * @returns {Promise<User | null>}
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
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
      await this.loginRecordRepository.update(loginRecord.id, loginRecord);
      throw new ServiceError(ErrorResponseMessages.EXPIRED_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    const user = await this.getUserById(loginRecord.user_id);

    if (!user) {
      throw new ServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
    }

    return {
      id: user.id,
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
    const user = await this.userRepository.findOne({ email });

    if (!user) {
      throw new ServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
    }

    const isPasswordMatching = await argon2.verify(user.password, password);
    if (!isPasswordMatching) {
      throw new ServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
    }

    const token = this.generateToken();
    const loginRecord = new NewLoginRecord({
      user_id: user.id,
      token,
      valid_till: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 1 day
      status: 'active',
    });

    const createdLoginRecord = await this.loginRecordRepository.create(loginRecord);

    return {
      id: user.id,
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
    await this.loginRecordRepository.update(loginRecord.id, loginRecord);
  }
}
