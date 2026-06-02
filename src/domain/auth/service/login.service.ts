/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { NewLoginRecord, type LoginRecord } from '@/domain/auth/models/login-record';
import type { User } from '@/domain/user/models/user';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { UserRepository } from '@/infrastructure/persistance/database/repositories/mongoose/user/user.repository';
import type { LoginRecordRepository } from '@/infrastructure/persistance/database/repositories/mongoose/auth/login-record.repository';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

export class LoginService extends BaseDomainService {
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
    return this.wrapInfrastructureErrors(async () => {
      return await this.loginRecordRepository.findOne({ token });
    });
  }

  /**
   * Get user from user ID
   *
   * @param {string} userId - The user ID
   * @returns {Promise<User | null>}
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userRepository.findById(userId);
    });
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
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<{ id: string; status: string }>}
   * @throws {DomainServiceError}
   */
  async validateToken(token: string, transactionOptions?: TransactionOptions): Promise<{ id: string; status: string }> {
    return this.wrapInfrastructureErrors(async () => {
      if (!token) {
        throw new DomainServiceError(ErrorResponseMessages.NO_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      const loginRecord = await this.getLoginRecordFromAuthToken(token);

      if (!loginRecord) {
        throw new DomainServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      if (loginRecord.status !== 'active') {
        throw new DomainServiceError(ErrorResponseMessages.EXPIRED_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      if (loginRecord.valid_till < new Date(new Date().getTime())) {
        loginRecord.status = 'expired';
        await this.loginRecordRepository.update(loginRecord.id, loginRecord, transactionOptions);
        throw new DomainServiceError(ErrorResponseMessages.EXPIRED_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      const user = await this.getUserById(loginRecord.user_id);

      if (!user) {
        throw new DomainServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      return {
        id: user.id,
        status: user.status,
      };
    });
  }

  /**
   * Authenticate user and create login session
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<{ id: string; status: string; token: string }>}
   * @throws {DomainServiceError}
   */
  async login(
    email: string,
    password: string,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; status: string; token: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const user = await this.userRepository.findOne({ email });

      if (!user) {
        throw new DomainServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
      }

      const isPasswordMatching = await argon2.verify(user.password, password);
      if (!isPasswordMatching) {
        throw new DomainServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
      }

      const token = this.generateToken();
      const loginRecord = new NewLoginRecord({
        user_id: user.id,
        token,
        valid_till: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 1 day
        status: 'active',
      });

      const createdLoginRecord = await this.loginRecordRepository.create(loginRecord, transactionOptions);

      return {
        id: user.id,
        status: user.status,
        token,
      };
    });
  }

  /**
   * Logout user by invalidating authentication token
   *
   * @param {string} token - The authentication token
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<void>}
   * @throws {DomainServiceError}
   */
  async logout(token: string, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      if (!token) {
        throw new DomainServiceError(ErrorResponseMessages.NO_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      const loginRecord = await this.getLoginRecordFromAuthToken(token);

      if (!loginRecord) {
        throw new DomainServiceError(ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER(), 'AUTHENTICATION_ERROR');
      }

      loginRecord.status = 'cancelled';
      await this.loginRecordRepository.update(loginRecord.id, loginRecord, transactionOptions);
    });
  }
}

export default LoginService;
