/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { Email, NewEmail } from '@/domain/app/email/models/email';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import { EmailRepository } from '@/infrastructure/persistance/database/repositories/mongoose/email/email.repository';

const NEWEST_FIRST: Record<string, 1 | -1> = { _id: -1 };

/**
 * Keeps the log of emails the application sends or tries to send.
 *
 * Errors from the repository reach the caller unchanged.
 *
 * @class EmailLoggerService
 *
 * @example
 * ```typescript
 * const emailLogger = new EmailLoggerService();
 * const email = await emailLogger.create(new NewEmail({ ...data, status: 'pending' }));
 * email.markSent();
 * await emailLogger.update(email);
 * ```
 */
export class EmailLoggerService {
  constructor(private readonly emailRepository: IEmailRepository = new EmailRepository()) {}

  /**
   * Generate an id for an email that is not logged yet, so it can be logged under that id later.
   *
   * @returns {string} A new id, unique to this email.
   */
  newId(): string {
    return new Types.ObjectId().toString();
  }

  /**
   * Get a logged email by its id.
   *
   * @param {string} id - The email's id.
   * @returns {Promise<Email | null>} The email, or null when there is none with that id.
   * @throws {RepositoryError} INVALID_ID when `id` is not a valid ObjectId.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure, or a stored record without a user_id.
   * @throws {DomainEntityError} When the stored record breaks an Email invariant.
   */
  async getById(id: string): Promise<Email | null> {
    return this.emailRepository.findById(id);
  }

  /**
   * Get every logged email, newest first.
   *
   * @returns {Promise<Email[]>} All logged emails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure, or a stored record without a user_id.
   * @throws {DomainEntityError} When a stored record breaks an Email invariant.
   */
  async getAll(): Promise<Email[]> {
    return this.emailRepository.find({}, undefined, undefined, NEWEST_FIRST);
  }

  /**
   * Get one page of logged emails, newest first.
   *
   * @param {number} offset - How many emails to skip; an integer >= 0.
   * @param {number} limit - How many emails to return at most; an integer > 0.
   * @returns {Promise<Email[]>} The emails on the page.
   * @throws {RangeError} When `offset` or `limit` is out of range; the database is not queried.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure, or a stored record without a user_id.
   * @throws {DomainEntityError} When a stored record breaks an Email invariant.
   */
  async get(offset: number, limit: number): Promise<Email[]> {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new RangeError(`offset must be an integer >= 0, got ${offset}`);
    }
    // Checked here because the repository treats a limit of 0 as "no limit".
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError(`limit must be an integer > 0, got ${limit}`);
    }
    return this.emailRepository.find({}, limit, offset, NEWEST_FIRST);
  }

  /**
   * Log a new email.
   *
   * @param {NewEmail} email - The email to log.
   * @returns {Promise<Email>} The logged email, with its id.
   * @throws {RepositoryError} INVALID_ID for a malformed id or user_id; DUPLICATE_KEY when the id is already taken.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  async create(email: NewEmail): Promise<Email> {
    return this.emailRepository.create(email);
  }

  /**
   * Save a logged email's current state, e.g. after `markSent()` or `markFailed()`.
   *
   * @param {Email} email - The email to save.
   * @returns {Promise<Email | null>} The saved email, or null when there is none with its id.
   * @throws {RepositoryError} INVALID_ID for a malformed id or user_id.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  async update(email: Email): Promise<Email | null> {
    return this.emailRepository.update(email.id, email);
  }
}

export default EmailLoggerService;
