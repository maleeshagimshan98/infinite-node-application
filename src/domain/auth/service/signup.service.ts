/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import type { User } from '@/domain/user/models/user';
import type { UserService } from '@/domain/user/service/user.service';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { NewEmailVerificationCode, type EmailVerificationCode } from '@/domain/auth/models/email-verification-code';
import type { IEmailVerificationCodeRepository } from '@/application/interfaces/repositories/auth/email-verification-code.repository.interface';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

const VERIFICATION_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SignupService extends BaseDomainService {
  /**
   * User service instance
   *
   * @private
   */
  private readonly userService: UserService;

  /**
   * Email verification code repository instance
   *
   * @private
   */
  private readonly emailVerificationCodeRepository: IEmailVerificationCodeRepository;

  constructor(userService: UserService, emailVerificationCodeRepository: IEmailVerificationCodeRepository) {
    super();
    this.userService = userService;
    this.emailVerificationCodeRepository = emailVerificationCodeRepository;
  }

  /**
   * Hash a verification code string using SHA-256 — only the hash is ever persisted.
   *
   * @param {string} code - The raw verification code string to hash.
   * @returns {string} The hex-encoded SHA-256 digest.
   */
  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Generate a cryptographically random verification code.
   *
   * @returns {string} A random hex-encoded token.
   */
  private generateCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Expire every pending email verification code for an email address.
   *
   * @param {string} email - The email address whose pending codes should be invalidated.
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND if a code is concurrently deleted mid-invalidation.
   */
  private async invalidatePendingCodes(email: string, transactionOptions?: TransactionOptions): Promise<void> {
    const codes: EmailVerificationCode[] = await this.emailVerificationCodeRepository.find(
      { email, status: 'pending' },
      undefined,
      undefined,
      {},
      transactionOptions,
    );
    // TODO: Should use a transaction or bulkWrite
    await Promise.all(
      codes.map(async (code) => {
        code.expire();
        const updated = await this.emailVerificationCodeRepository.update(code.id, code, transactionOptions);
        if (!updated) {
          throw new DomainServiceError(
            `The Email verification code with the id equal to ${code.id} could not be found.`,
            'NOT_FOUND',
          );
        }
      }),
    );
  }

  /**
   * Generate and persist a fresh email verification code, invalidating any existing pending
   * codes for the same email first.
   *
   * @param {string} userId - The id of the user the code belongs to.
   * @param {string} email - The email address to verify.
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations.
   * @returns {Promise<{ record: EmailVerificationCode; rawCode: string }>} The persisted record and the raw
   * (unhashed) code — the raw code is never stored and must be delivered to the user out-of-band (e.g. email).
   * @throws {DomainServiceError} NOT_FOUND if a pending code is concurrently deleted mid-invalidation.
   */
  async createVerificationCode(
    userId: string,
    email: string,
    transactionOptions?: TransactionOptions,
  ): Promise<{ record: EmailVerificationCode; rawCode: string }> {
    return this.wrapInfrastructureErrors(async () => {
      await this.invalidatePendingCodes(email, transactionOptions);

      const rawCode = this.generateCode();
      const newCode = new NewEmailVerificationCode({
        user_id: userId,
        email,
        code: this.hashCode(rawCode),
        status: 'pending',
        valid_till: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      });

      const record = await this.emailVerificationCodeRepository.create(newCode, transactionOptions);
      return { record, rawCode };
    });
  }

  /**
   * Verify a user's email using a previously issued verification code, then activate the account.
   *
   * @param {string} email - User email.
   * @param {string} code - The raw verification code presented by the user.
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND if the user does not exist, or no matching pending code is found.
   * @throws {DomainServiceError} VALIDATION_ERROR if the matching code has expired.
   */
  async verifyEmail(email: string, code: string, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      const user: User | null = await this.userService.getByEmail(email, transactionOptions);

      if (!user) {
        throw new DomainServiceError(`The User with the email equal to ${email} could not be found.`, 'NOT_FOUND');
      }

      const record = await this.emailVerificationCodeRepository.findOne(
        { email, code: this.hashCode(code), status: 'pending' },
        {},
        transactionOptions,
      );

      // Deliberately do not echo the submitted code in this error message — it's a secret token,
      // not a business identifier, and shouldn't appear in logs/responses.
      if (!record) {
        throw new DomainServiceError(`Invalid or expired email verification code for ${email}.`, 'NOT_FOUND');
      }

      if (record.isExpired()) {
        record.expire();
        await this.emailVerificationCodeRepository.update(record.id, record, transactionOptions);
        throw new DomainServiceError(`The email verification code for ${email} has expired.`, 'VALIDATION_ERROR');
      }

      record.markVerified();
      const updated = await this.emailVerificationCodeRepository.update(record.id, record, transactionOptions);
      if (!updated) {
        throw new DomainServiceError(
          `The Email verification code with the id equal to ${record.id} could not be found.`,
          'NOT_FOUND',
        );
      }

      await this.invalidatePendingCodes(email, transactionOptions);

      if (!user.isActive()) {
        user.activate();
        // Pass only the changed field — UserService.update() re-hashes `password` whenever it's
        // present in the payload, and `user.password` here already holds the stored hash.
        await this.userService.update(user.id, { status: user.status }, transactionOptions);
      }
    });
  }

  /**
   * Request a fresh email verification code for an already-registered, not-yet-verified user.
   * Only reissues a code when a pending one already exists for the email — a user with no
   * pending code (none ever issued, or the existing one was already consumed/expired) must go
   * through registration again rather than resending.
   *
   * @param {string} email - User email.
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations.
   * @returns {Promise<{ userId: string; rawCode: string }>} The user's id and the raw (unhashed) code.
   * @throws {DomainServiceError} NOT_FOUND if the user does not exist, or no pending verification code exists for the email.
   * @throws {DomainServiceError} INVALID_OPERATION if the user's email is already verified.
   */
  async resendVerificationCode(
    email: string,
    transactionOptions?: TransactionOptions,
  ): Promise<{ userId: string; rawCode: string }> {
    return this.wrapInfrastructureErrors(async () => {
      const user: User | null = await this.userService.getByEmail(email, transactionOptions);

      if (!user) {
        throw new DomainServiceError(`The User with the email equal to ${email} could not be found.`, 'NOT_FOUND');
      }

      if (user.isActive()) {
        throw new DomainServiceError(`The email for ${email} is already verified.`, 'INVALID_OPERATION');
      }

      const existingCode = await this.emailVerificationCodeRepository.findOne(
        { email, status: 'pending' },
        {},
        transactionOptions,
      );
      if (!existingCode) {
        throw new DomainServiceError(`No pending email verification code found for ${email}.`, 'NOT_FOUND');
      }

      const { rawCode } = await this.createVerificationCode(user.id, email, transactionOptions);
      return { userId: user.id, rawCode };
    });
  }
}

export default SignupService;
