/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICircuitBreaker } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue } from '@/application/interfaces/infrastructure/queue.interface';
import { BaseEmailService } from '@/infrastructure/email/base/base-email.service';
import type { IEmailMessage } from '@/infrastructure/email/base/base-email.service';
import type { EmailLoggerService } from '@/infrastructure/email/email-log/email-logger.service';

import { SmtpError } from './error/smtp.error';

import type { SMTPDriver } from './driver/smtp.driver';
import type { Transporter } from 'nodemailer';

/**
 * SMTP Email Service Implementation
 *
 * Provides email functionality using SMTP protocol. Sends go through a circuit breaker, so while the
 * SMTP server keeps failing they are rejected immediately instead of each waiting out the connection timeout.
 *
 * Emails are normally queued with `enqueueEmail()` and sent by the email worker through `deliverQueuedEmail()`,
 * which keeps the email log (see BaseEmailService). `sendEmail()` sends immediately and logs nothing.
 *
 * @class SMTPEmailService
 * @extends {BaseEmailService}
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
export class SMTPEmailService extends BaseEmailService {
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
    super(queue, emailLogger, logger, driver.config().queue);
    this.driver = driver;
    this.circuitBreaker = circuitBreaker;
    const client = this.driver.client();
    if (!client) {
      throw new SmtpError('Invalid SMTP client provided to SMTPEmailService', {});
    }
    this.transporter = client;
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
   * @param {IEmailMessage} message - The recipients, subject and body
   * @returns {Promise<void>} resolving when the message has been handed off to the SMTP transport
   * @throws {SmtpError} EMAIL_ERROR when the SMTP transport fails to send the message; `data.code` holds nodemailer's code
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SMTP circuit is open and the message was not attempted
   */
  protected override async transport(message: IEmailMessage): Promise<void> {
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
}
