/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { User } from '@/domain/user/models/user';
import { NewPasswordResetCode, type PasswordResetCode } from '@/domain/auth/models/password-reset-code';
import type { LoginRecord } from '@/domain/auth/models/login-record';
import type { UserRepository } from '@/infrastructure/persistance/database/repositories/mongoose/user/user.repository';
import type { PasswordResetCodeRepository } from '@/infrastructure/persistance/database/repositories/mongoose/auth/password-reset-code.repository';
import type { LoginRecordRepository } from '@/infrastructure/persistance/database/repositories/mongoose/auth/login-record.repository';

export class AccountRecoveryService extends BaseDomainService {
  /**
   * User repository instance
   *
   * @private
   */
  private readonly userRepository: UserRepository;

  /**
   * Password reset code repository instance
   *
   * @private
   */
  private readonly passwordResetCodeRepository: PasswordResetCodeRepository;

  /**
   * Login record repository instance
   *
   * @private
   */
  private readonly loginRecordRepository: LoginRecordRepository;

  constructor(
    userRepository: UserRepository,
    passwordResetCodeRepository: PasswordResetCodeRepository,
    loginRecordRepository: LoginRecordRepository,
  ) {
    super();
    this.userRepository = userRepository;
    this.passwordResetCodeRepository = passwordResetCodeRepository;
    this.loginRecordRepository = loginRecordRepository;
  }

  /**
   * Get user by email
   *
   * @param {string} email - User email
   * @returns {Promise<User | null>}
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ email });
  }

  /**
   * Cancel all old reset codes for a user
   *
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async cancelOldResetCodes(email: string): Promise<void> {
    const resetCodes: PasswordResetCode[] = await this.passwordResetCodeRepository.find({ email });
    // TODO: Should use a transaction or bulkWrite
    await Promise.all(
      resetCodes.map(async (resetCode) => {
        resetCode.status = 'cancelled';
        await this.passwordResetCodeRepository.update(resetCode.id, resetCode);
      }),
    );
  }

  /**
   * Generate a random reset code
   *
   * @returns {string} A random reset code
   */
  generateResetCode(): string {
    return Math.random().toString(36).substr(2);
  }

  /**
   * Initiate password reset process
   *
   * @param {string} email - User email
   * @returns {Promise<void>}
   * @throws {DomainServiceError} MODEL_NOT_FOUND if user doesn't exist
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new DomainServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'MODEL_NOT_FOUND');
    }

    await this.cancelOldResetCodes(email);

    const passwordResetCode = new NewPasswordResetCode({
      email: email,
      code: this.generateResetCode(),
      valid_till: new Date(new Date().getTime() + 0.5 * 60 * 60 * 1000),
      status: 'active',
    });

    await this.passwordResetCodeRepository.create(passwordResetCode);
  }

  /**
   * Reset user password with verification code
   *
   * @param {string} email - User email
   * @param {string} verificationCode - Password reset verification code
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   * @throws {DomainServiceError} MODEL_NOT_FOUND if reset code or user doesn't exist
   */
  async resetPassword(email: string, verificationCode: string, newPassword: string): Promise<void> {
    const passwordResetCode = await this.passwordResetCodeRepository.findOne({
      email: email,
      code: verificationCode,
      status: 'active',
    });

    if (!passwordResetCode) {
      throw new DomainServiceError(
        ErrorResponseMessages.NOT_FOUND_ERROR('Password reset code', 'verification_code', verificationCode),
        'MODEL_NOT_FOUND',
      );
    }

    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new DomainServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'MODEL_NOT_FOUND');
    }

    // TODO: MUST USE A DATABASE TRANSACTION FOR ALL BELOW DATA MUTATIONS
    const hashedPassword = await argon2.hash(newPassword);
    user.password = hashedPassword;
    passwordResetCode.status = 'used';

    await this.passwordResetCodeRepository.update(passwordResetCode.id, passwordResetCode);
    await this.userRepository.update(user.id, user);

    // TODO: Find all and modify all of the login records
    const loginRecord: LoginRecord | null = await this.loginRecordRepository.findOne({
      user_id: user.id,
      status: 'active',
    });

    if (loginRecord) {
      loginRecord.status = 'cancelled';
      await this.loginRecordRepository.update(loginRecord.id, loginRecord);
    }
  }
}

export default AccountRecoveryService;
