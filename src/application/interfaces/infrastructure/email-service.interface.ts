/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';
import type { Job } from '@/application/interfaces/infrastructure/queue.interface';
import type { NewEmail } from '@/domain/app/email/models/email';

/**
 * A queued email. Jobs are stored as JSON, so the fields are plain values.
 */
export interface IEmailJobData {
  /** The email log record's id, generated before the job is queued. */
  id: string;
  user_id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  ttl: number;
}

export interface IEmailService extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'emailService'} Always `emailService`.
   */
  serviceName(): 'emailService';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;

  /**
   * Send an email immediately, without queueing or logging it
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body content (HTML or plain text)
   * @returns {Promise<void>} resolving when email is sent
   * @throws {InfrastructureError} EMAIL_ERROR when the provider fails to send the email.
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the provider's circuit is open and
   * the email was not attempted.
   */
  sendEmail(to: string, subject: string, body: string): Promise<void>;

  /**
   * The name of the queue that queued emails wait in
   *
   * @returns {string} The email queue name
   */
  emailQueueName(): string;

  /**
   * Queue an email for the email worker to log and send
   *
   * @param {NewEmail} email - The email to send; must be pending
   * @returns {Promise<void>} resolving once the email is queued. The worker writes the log record.
   * @throws {RangeError} when the email is not pending; nothing is queued.
   * @throws {InfrastructureError} QUEUE_ERROR when the job cannot be queued.
   */
  enqueueEmail(email: NewEmail): Promise<void>;

  /**
   * Log and send one queued email; called by the email worker for each job
   *
   * @param {Job<IEmailJobData>} job - The queued email
   * @returns {Promise<void>} resolving once the email is sent, or skipped because it was already handled
   * @throws {RepositoryError} INVALID_ID when the job's id or user_id is malformed.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure while logging the email.
   * @throws {DomainEntityError} when the job's data breaks an Email invariant.
   * @throws {InfrastructureError} EMAIL_ERROR when the provider fails to send the email.
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the provider's circuit is open and
   * the email was not attempted.
   */
  deliverQueuedEmail(job: Job<IEmailJobData>): Promise<void>;
}
