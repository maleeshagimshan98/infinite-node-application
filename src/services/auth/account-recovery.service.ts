/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { HydratedDocument } from 'mongoose';
import argon2 from 'argon2';
import { BaseService } from '../base/BaseService';
import { ServiceError } from '../base/ServiceError';
import { User } from '../../models/user/user.model';
import type { IUser } from '../../models/user/user.model';
import { PasswordResetCodesModel } from '../../models/auth/password-reset-code.model';
import { LoginRecord } from '../../models/auth/login-record.model';
import { ErrorResponseMessages } from '../../app/core/utils/error-response-messages';

export class AccountRecoveryService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get user by email
   *
   * @param {string} email - User email
   * @returns {Promise<HydratedDocument<IUser> | null>}
   */
  async getUserByEmail(email: string): Promise<HydratedDocument<IUser> | null> {
    return await User.findOne({ email }).exec();
  }

  /**
   * Cancel all old reset codes for a user
   *
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async cancelOldResetCodes(email: string): Promise<void> {
    const resetCodes = await PasswordResetCodesModel.find({ email }).exec();
    // TODO: Should use a transaction or bulkWrite
    await Promise.all(
      resetCodes.map(async (resetCode) => {
        resetCode.status = 'cancelled';
        await resetCode.save();
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
   * @throws {ServiceError}
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new ServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'MODEL_NOT_FOUND');
    }

    await this.cancelOldResetCodes(email);

    const passwordResetCode = new PasswordResetCodesModel({
      email: email,
      code: this.generateResetCode(),
      valid_till: new Date(new Date().getTime() + 0.5 * 60 * 60 * 1000),
      status: 'active',
    });

    await passwordResetCode.save();
  }

  /**
   * Reset user password with verification code
   *
   * @param {string} email - User email
   * @param {string} verificationCode - Password reset verification code
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   * @throws {ServiceError}
   */
  async resetPassword(email: string, verificationCode: string, newPassword: string): Promise<void> {
    const passwordResetCode = await PasswordResetCodesModel.findOne({
      email: email,
      code: verificationCode,
      status: 'active',
    });

    if (!passwordResetCode) {
      throw new ServiceError(
        ErrorResponseMessages.NOT_FOUND_ERROR('Password reset code', 'verification_code', verificationCode),
        'MODEL_NOT_FOUND',
      );
    }

    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new ServiceError(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email), 'MODEL_NOT_FOUND');
    }

    // TODO: MUST USE A DATABASE TRANSACTION FOR ALL BELOW DATA MUTATIONS
    user.password = await argon2.hash(newPassword);
    passwordResetCode.status = 'used';

    await passwordResetCode.save();
    await user.save();

    // TODO: Find all and modify all of the login records
    const loginRecord = await LoginRecord.findOne({
      user_id: user.id,
      status: 'active',
    }).exec();

    if (loginRecord) {
      loginRecord.status = 'cancelled';
      await loginRecord.save();
    }
  }
}
