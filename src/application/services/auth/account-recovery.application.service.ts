/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { NewEmail } from '@/domain/app/email/models/email';
import type { AccountRecoveryService } from '@/domain/auth/service/account-recovery.service';
import type { IDatabaseMapper } from '@/application/interfaces';
import type { IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { BaseApplicationService } from '../base/base.application.service';

import type { LoginApplicationService } from './login.application.service';

// Matches the reset code's 30 min lifetime in AccountRecoveryService.
const PASSWORD_RESET_EMAIL_TTL_SECONDS = 30 * 60;

/**
 * Orchestrates password recovery: issues a reset code in one transaction (the old codes are cancelled and the new one
 * created together), then emails the code to the user; resets the password in one transaction (the code is used, the
 * password set and every session revoked together), then drops the revoked sessions from the cache.
 *
 * @extends BaseApplicationService
 */
export class AccountRecoveryApplicationService extends BaseApplicationService {
  private accountRecoveryService: AccountRecoveryService;
  private loginApplicationService: LoginApplicationService;
  private emailService: IEmailService;
  private logger: ILogger;

  constructor(
    database_mapper: IDatabaseMapper,
    accountRecoveryService: AccountRecoveryService,
    loginApplicationService: LoginApplicationService,
    emailService: IEmailService,
    logger: ILogger,
  ) {
    super(database_mapper);
    this.accountRecoveryService = accountRecoveryService;
    this.loginApplicationService = loginApplicationService;
    this.emailService = emailService;
    this.logger = logger;
  }

  /**
   * Queue a password reset email, swallowing and logging any failure to queue it so it never fails the caller's
   * request: the code is already issued, and the user can ask for a new one.
   *
   * @param {string} userId - The id of the user the email is sent to.
   * @param {string} email - The recipient's email address.
   * @param {string} rawCode - The reset code to deliver.
   * @returns {Promise<void>}
   */
  private async sendPasswordResetEmail(userId: string, email: string, rawCode: string): Promise<void> {
    try {
      await this.emailService.enqueueEmail(
        new NewEmail({
          user_id: userId,
          to: [email],
          subject: 'Reset your password',
          body: `Your password reset code is: ${rawCode}`,
          status: 'pending',
          ttl: PASSWORD_RESET_EMAIL_TTL_SECONDS,
        }),
      );
    } catch (error) {
      this.logger.logError('Failed to queue password reset email', { userId, error });
    }
  }

  /**
   * Issue a password reset code for the user with the given email, and email it to them.
   *
   * @param {string} email - The user's email.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given email.
   * @throws {DomainServiceError} CONFLICT when an old reset code changed concurrently while being cancelled.
   * @throws {DomainServiceError} ALREADY_EXISTS when a concurrent request issued an active reset code first.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached to run the transaction.
   * @throws {PersistanceError} when the database otherwise fails while running or committing the transaction.
   */
  async forgotPassword(email: string): Promise<void> {
    const issued = await this.dbTransaction(async ({ session }) => {
      return await this.accountRecoveryService.forgotPassword(email, { session });
    });

    // Queueing the email is deliberately outside the transaction: a queue failure must never roll back the code.
    await this.sendPasswordResetEmail(issued.userId, issued.email, issued.rawCode);
  }

  /**
   * Reset a user's password with a reset code they received by email, in one transaction that also revokes every
   * active session of the user. Once it commits, the revoked sessions are dropped from the cache, so none of them
   * validates again.
   *
   * @param {string} email - The user's email.
   * @param {string} verificationCode - The reset code.
   * @param {string} newPassword - The new password.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND when the reset code or the user doesn't exist, or a login record is deleted
   * while it is being revoked.
   * @throws {DomainServiceError} VALIDATION_ERROR when the reset code has expired.
   * @throws {DomainServiceError} CONFLICT when the reset code, the user or a login record changed concurrently.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached while running or committing
   * the transaction.
   * @throws {PersistanceError} when the database otherwise fails while running, committing or aborting the
   * transaction.
   * @throws {Error} when argon2 cannot hash the new password.
   */
  async resetPassword(email: string, verificationCode: string, newPassword: string): Promise<void> {
    const revoked = await this.dbTransaction(async ({ session }) => {
      return await this.accountRecoveryService.resetPassword(email, verificationCode, newPassword, { session });
    });

    // After the commit: evicting earlier would let a concurrent read re-trust a row the transaction then revoked.
    await this.loginApplicationService.evictLoginRecords(revoked);
  }
}

export default AccountRecoveryApplicationService;
