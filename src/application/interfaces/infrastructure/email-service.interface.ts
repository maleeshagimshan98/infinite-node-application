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
  serviceName(): 'emailService';
  singleton(): true;
  deferred(): false;

  /**
   * Send an email immediately, without queueing or logging it
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body content (HTML or plain text)
   * @returns {Promise<void>} resolving when email is sent
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
   * @returns {Promise<string>} The email's log id, once the email is queued. The worker writes the log record.
   */
  enqueueEmail(email: NewEmail): Promise<string>;

  /**
   * Log and send one queued email; called by the email worker for each job
   *
   * @param {Job<IEmailJobData>} job - The queued email
   * @returns {Promise<void>} resolving once the email is sent, or skipped because it was already handled
   */
  deliverQueuedEmail(job: Job<IEmailJobData>): Promise<void>;
}
