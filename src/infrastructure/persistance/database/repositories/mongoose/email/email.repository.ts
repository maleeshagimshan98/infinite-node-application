/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Email, NewEmail } from '@/domain/app/email/models/email';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

import { BaseRepository } from '../base/base-repository';
import { EmailMapper } from './email.mapper';
import { EmailModel } from './email.model';

import type { INewEmailSchema } from './email.model';

// ObjectIds start with their creation time, so sorting on _id orders emails by when they were logged.
const NEWEST_FIRST: Record<string, 1 | -1> = { _id: -1 };

export class EmailRepository extends BaseRepository<INewEmailSchema, Email, NewEmail> implements IEmailRepository {
  constructor() {
    super(EmailModel, new EmailMapper());
  }

  /**
   * Find logged emails, newest first. Runs through the inherited `find()`, which translates database errors.
   *
   * @param {number} [limit] - Maximum number of emails to return; 0 or omitted means no limit.
   * @param {number} [offset] - Number of emails to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<Email[]>} The emails, newest first.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure, or a stored record without a user_id.
   * @throws {DomainEntityError} When a stored record breaks an Email invariant.
   */
  async findNewestFirst(limit?: number, offset?: number, transactionOptions?: TransactionOptions): Promise<Email[]> {
    return this.find({}, limit, offset, NEWEST_FIRST, transactionOptions);
  }
}

export default EmailRepository;
