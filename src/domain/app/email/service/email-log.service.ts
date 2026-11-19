/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Email } from '@/domain/app/email/models/email';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';

/**
 * Email Log Service
 *
 * Reads the log of emails the application sent or tried to send. Only the email infrastructure writes the log, so
 * this service has no write methods. Not named `EmailService`: that DI token belongs to the infrastructure email
 * service.
 *
 * @extends BaseDomainService
 */
export class EmailLogService extends BaseDomainService {
  constructor(private readonly emailRepository: IEmailRepository) {
    super();
  }

  /**
   * Get logged emails, newest first, optionally paginated.
   *
   * @param {number} [limit] - Maximum number of emails to return.
   * @param {number} [offset] - Number of emails to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Email[]>} The emails, newest first.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getAll(limit?: number, offset?: number, transactionOptions?: TransactionOptions): Promise<Email[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.emailRepository.findNewestFirst(limit, offset, transactionOptions);
    });
  }

  /**
   * Get a logged email by its id.
   *
   * @param {string} id - The email's id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Email>} The matching email.
   * @throws {DomainServiceError} NOT_FOUND when no email exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<Email> {
    return this.wrapInfrastructureErrors(async () => {
      const email = await this.emailRepository.findById(id, transactionOptions);
      if (!email) {
        throw new DomainServiceError(`The Email with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return email;
    });
  }
}

export default EmailLogService;
