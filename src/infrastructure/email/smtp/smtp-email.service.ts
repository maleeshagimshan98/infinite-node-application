/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmailJobData, IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ICircuitBreaker } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue, Job } from '@/application/interfaces/infrastructure/queue.interface';
import { NewEmail } from '@/domain/app/email/models/email';
import type { Email } from '@/domain/app/email/models/email';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';
import type { EmailLoggerService } from '@/infrastructure/email/email-log/email-logger.service';

import { SmtpError } from './error/smtp.error';

import type { SMTPDriver } from './driver/smtp.driver';
import type { Transporter } from 'nodemailer';

/**
 * The parts of one message handed to the SMTP transport
 */
interface ISMTPMessage {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}

/**
 * Describe a thrown value for the email log and the logs.
 *
 * @param {unknown} error - The thrown value.
 * @returns {string} The error's message, or the value as a string; never empty.
 */
function describeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error) || 'Unknown error';
}

/**
 * SMTP Email Service Implementation
 *
 * Provides email functionality using SMTP protocol. Sends go through a circuit breaker, so while the
 * SMTP server keeps failing they are rejected immediately instead of each waiting out the connection timeout.
 *
 * Emails are normally queued with `enqueueEmail()` and sent by the email worker through `deliverQueuedEmail()`,
 * which keeps the email log. `sendEmail()` sends immediately and logs nothing.
 *
 * @class SMTPEmailService
 * @implements {IEmailService}
 *
 * @example
 * ```typescript
 * const emailService = new SMTPEmailService(driver, circuitBreaker, queue, new EmailLoggerService(), logger);
 *
 * // API process: queue the email
 * const emailId = await emailService.enqueueEmail(
 *   new NewEmail({ user_id, to: ['user@example.com'], subject: 'Welcome!', body: '<h1>Hi</h1>', status: 'pending', ttl: 0 }),
 * );
 *
 * // Worker process: log and send each queued email
 * await queue.processJobs<IEmailJobData>(emailService.emailQueueName(), (job) => emailService.deliverQueuedEmail(job));
 * ```
 */
export class SMTPEmailService implements IEmailService {
  private readonly driver: SMTPDriver;

  /**
   * Nodemailer transporter instance from the driver layer
   * Used to send emails
   *
   * @type {Transporter}
   */
  private readonly transporter: Transporter;

  /**
   * Circuit breaker guarding every send
   *
   * @type {ICircuitBreaker}
   */
  private readonly circuitBreaker: ICircuitBreaker;

  /**
   * Queue that queued emails wait in until the email worker sends them
   *
   * @type {IQueue}
   */
  private readonly queue: IQueue;

  /**
   * Keeps the log of queued emails
   *
   * @type {EmailLoggerService}
   */
  private readonly emailLogger: EmailLoggerService;

  /**
   * Records failures that cannot be reported to a caller, such as a log update after a successful send
   *
   * @type {ILogger}
   */
  private readonly logger: ILogger;

  /**
   * Creates an instance of SMTPEmailService from an initialized SMTP driver, the breaker guarding its sends, the
   * queue that queued emails wait in, the email log, and the application logger
   */
  constructor(
    driver: SMTPDriver,
    circuitBreaker: ICircuitBreaker,
    queue: IQueue,
    emailLogger: EmailLoggerService,
    logger: ILogger,
  ) {
    this.driver = driver;
    this.circuitBreaker = circuitBreaker;
    this.queue = queue;
    this.emailLogger = emailLogger;
    this.logger = logger;
    const client = this.driver.client();
    if (!client) {
      throw new SmtpError('Invalid SMTP client provided to SMTPEmailService', {});
    }
    this.transporter = client;
  }

  /**
   * Returns the service name identifier for this infrastructure service
   *
   * @returns {'emailService'} Service name identifier
   */
  serviceName(): 'emailService' {
    return 'emailService';
  }

  /**
   * Indicates that this service should be treated as a singleton within the application context
   *
   * @returns {true}
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this service should be deferred during initialization
   *
   * @returns {false}
   */
  deferred(): false {
    return false;
  }

  /**
   * Get the underlying SMTP driver instance
   *
   * @returns {SMTPDriver} The SMTP driver instance
   */
  getDriver(): SMTPDriver {
    return this.driver;
  }

  /**
   * Report the SMTP circuit breaker's state for the health check
   *
   * @returns {ICircuitBreakerStatus[]} The single SMTP breaker's status
   */
  circuitBreakerStatuses(): ICircuitBreakerStatus[] {
    return [this.circuitBreaker.circuitBreakerStatus()];
  }

  /**
   * Hand one message to the SMTP transport through the circuit breaker
   *
   * @param {ISMTPMessage} message - The recipients, subject and body
   * @returns {Promise<void>} resolving when the message has been handed off to the SMTP transport
   * @throws {SmtpError} EMAIL_ERROR when the SMTP transport fails to send the message; `data.code` holds nodemailer's code
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SMTP circuit is open and the message was not attempted
   */
  private async transport(message: ISMTPMessage): Promise<void> {
    await this.circuitBreaker.execute(() =>
      this.transporter
        .sendMail({
          from: this.driver.config().from,
          to: message.to,
          cc: message.cc,
          bcc: message.bcc,
          subject: message.subject,
          html: message.body,
        })
        .catch((error: unknown) => {
          throw new SmtpError(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`, {
            code: error instanceof Error && 'code' in error ? error.code : undefined,
            cause: error,
          });
        }),
    );
  }

  /**
   * Sends an email to a recipient immediately, without queueing or logging it
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} body - Email body content (HTML or plain text)
   * @returns {Promise<void>} resolving when the email has been handed off to the SMTP transport
   * @throws {SmtpError} EMAIL_ERROR when the SMTP transport fails to send the email; `data.code` holds nodemailer's code
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SMTP circuit is open and the email was not attempted
   *
   * @example
   * ```typescript
   * // Send a plain text email
   * await emailService.sendEmail(
   *   'customer@example.com',
   *   'Order Confirmation',
   *   'Your order #12345 has been confirmed.'
   * );
   *
   * // Send an HTML email
   * await emailService.sendEmail(
   *   'user@example.com',
   *   'Password Reset',
   *   '<p>Click <a href="https://example.com/reset">here</a> to reset your password.</p>'
   * );
   * ```
   */
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await this.transport({ to: [to], cc: [], bcc: [], subject, body });
  }

  /**
   * The name of the queue that queued emails wait in
   *
   * @returns {string} The configured email queue name
   */
  emailQueueName(): string {
    return this.driver.config().queue.name;
  }

  /**
   * Queue an email for the email worker, retried with the configured attempts and backoff
   *
   * Nothing is written to the email log here: the worker logs the email before sending it, so the email is not
   * lost while the database is unreachable. Only when the job cannot be queued is a failed record logged.
   *
   * @param {NewEmail} email - The email to send; must be pending
   * @returns {Promise<string>} The id the email will be logged under
   * @throws {RangeError} When the email is not pending; nothing is queued
   * @throws {QueueError} QUEUE_ERROR when the job cannot be queued
   */
  async enqueueEmail(email: NewEmail): Promise<string> {
    if (email.status !== 'pending') {
      throw new RangeError(`Only a pending email can be queued; this one is ${email.status}`);
    }

    const queueConfig = this.driver.config().queue;
    // Generated now, so every retry of the job logs and finds the same record.
    const data: IEmailJobData = {
      id: email.id ?? this.emailLogger.newId(),
      user_id: email.user_id,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      body: email.body,
      ttl: email.ttl,
    };

    if (!this.queue.hasQueue(queueConfig.name)) {
      this.queue.newQueue(queueConfig.name);
    }

    try {
      await this.queue.addJob<IEmailJobData>(queueConfig.name, data, {
        attempts: queueConfig.attempts,
        backoff: { type: queueConfig.backoff, delay: queueConfig.retryDelay },
        // The email log is the lasting record; a finished job only holds a copy of the body.
        removeOnComplete: true,
        removeOnFail: true,
      });
    } catch (error) {
      await this.logUnqueuedEmail(data, error);
      throw error;
    }

    return data.id;
  }

  /**
   * Log and send one queued email
   *
   * The email is logged as pending before it is sent, so a database failure sends nothing and the job is retried.
   * A failed send is retried too, and marked failed in the log on the last attempt. An email that is no longer
   * pending (a job running again after it finished) is not sent again.
   *
   * @param {Job<IEmailJobData>} job - The queued email
   * @returns {Promise<void>} resolving once the email is sent, or skipped because it was already handled
   * @throws {RepositoryError} INVALID_ID when the job's id or user_id is malformed
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached
   * @throws {PersistanceError} For any other database failure while logging the email
   * @throws {DomainEntityError} When the job's data breaks an Email invariant
   * @throws {SmtpError} EMAIL_ERROR when the SMTP transport fails to send the email
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SMTP circuit is open and the email was not attempted
   */
  async deliverQueuedEmail(job: Job<IEmailJobData>): Promise<void> {
    const attempt = job.attemptsMade + 1;
    const lastAttempt = attempt >= this.driver.config().queue.attempts;

    let email: Email;
    try {
      email = await this.findOrLogEmail(job.data);
    } catch (error) {
      if (lastAttempt) {
        this.logger.logError('A queued email could not be logged after its last attempt and was not sent', {
          emailId: job.data.id,
          attempt,
          error,
        });
      }
      throw error;
    }

    if (email.status !== 'pending') {
      this.logger.logWarn(`A queued email is already ${email.status}; it is not sent again`, {
        emailId: email.id,
        jobId: job.id,
      });
      return;
    }

    try {
      await this.transport({ to: email.to, cc: email.cc, bcc: email.bcc, subject: email.subject, body: email.body });
    } catch (error) {
      if (lastAttempt) {
        this.logger.logError(`A queued email could not be sent after ${attempt} attempts`, {
          emailId: email.id,
          error,
        });
        email.markFailed(describeError(error));
        await this.updateLog(email);
      }
      throw error;
    }

    email.markSent();
    // Not rethrown on failure: a retried job would find the email still pending and send it again.
    await this.updateLog(email);
  }

  /**
   * Find a queued email's log record, logging it as pending first if it is not logged yet
   *
   * @param {IEmailJobData} data - The queued email
   * @returns {Promise<Email>} The email's log record
   * @throws {RepositoryError} INVALID_ID when the id or user_id is malformed
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached
   * @throws {PersistanceError} For any other database failure
   * @throws {DomainEntityError} When the data breaks an Email invariant
   */
  private async findOrLogEmail(data: IEmailJobData): Promise<Email> {
    const logged = await this.emailLogger.getById(data.id);
    if (logged) {
      return logged;
    }

    try {
      return await this.emailLogger.create(new NewEmail({ ...data, status: 'pending' }));
    } catch (error) {
      // Another run of the same job logged it first.
      if (error instanceof RepositoryError && error.type === 'DUPLICATE_KEY') {
        const existing = await this.emailLogger.getById(data.id);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Save a sent or failed email's status to the log, logging instead of throwing when that fails
   *
   * @param {Email} email - The email whose status changed
   * @returns {Promise<void>}
   */
  private async updateLog(email: Email): Promise<void> {
    try {
      const updated = await this.emailLogger.update(email);
      if (!updated) {
        this.logger.logWarn(`An email's log record was gone before it could be marked ${email.status}`, {
          emailId: email.id,
        });
      }
    } catch (error) {
      this.logger.logError(`An email could not be marked ${email.status} in the email log`, {
        emailId: email.id,
        error,
      });
    }
  }

  /**
   * Log an email that could not be queued as failed, logging instead of throwing when that fails
   *
   * @param {IEmailJobData} data - The email that could not be queued
   * @param {unknown} error - Why it could not be queued
   * @returns {Promise<void>}
   */
  private async logUnqueuedEmail(data: IEmailJobData, error: unknown): Promise<void> {
    try {
      await this.emailLogger.create(
        new NewEmail({
          ...data,
          body: '',
          status: 'failed',
          error_message: `Could not be queued: ${describeError(error)}`,
        }),
      );
    } catch (logError) {
      this.logger.logError('An email that could not be queued could not be logged either', {
        emailId: data.id,
        error: logError,
      });
    }
  }
}
