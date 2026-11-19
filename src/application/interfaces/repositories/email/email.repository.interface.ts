/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Email, NewEmail } from '@/domain/app/email/models/email';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

import type { IBaseRepository } from '../base.repository.interface';

export interface IEmailRepository extends IBaseRepository<Email, NewEmail> {
  /**
   * Find logged emails, newest first.
   *
   * @param {number} [limit] - Maximum number of emails to return; 0 or omitted means no limit.
   * @param {number} [offset] - Number of emails to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<Email[]>} The emails, newest first.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  findNewestFirst(limit?: number, offset?: number, transactionOptions?: TransactionOptions): Promise<Email[]>;
}

export default IEmailRepository;
