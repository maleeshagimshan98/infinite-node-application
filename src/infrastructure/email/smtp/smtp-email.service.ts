/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmail } from '@/application/interfaces/infrastructure/email.interface';
import type { ICircuitBreaker } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';

import { SmtpError } from './error/smtp.error';

import type { SMTPDriver } from './driver/smtp.driver';
import type { Transporter } from 'nodemailer';

/**
 * SMTP Email Service Implementation
 *
 * Provides email functionality using SMTP protocol. Sends go through a circuit breaker, so while the
 * SMTP server keeps failing they are rejected immediately instead of each waiting out the connection timeout.
 *
 * @class SMTPEmailService
 * @implements {IEmail}
 *
 * @example
 * ```typescript
 * const emailService = new SMTPEmailService(driver, circuitBreaker);
 *
 * await emailService.sendEmail(
 *   'user@example.com',
 *   'Welcome!',
 *   '<h1>Welcome to our service</h1>'
 * );
 * ```
 */
export class SMTPEmailService implements IEmail {
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
   * Creates an instance of SMTPEmailService from an initialized SMTP driver and the breaker guarding its sends
   */
  constructor(driver: SMTPDriver, circuitBreaker: ICircuitBreaker) {
    this.driver = driver;
    this.circuitBreaker = circuitBreaker;
    const client = this.driver.client();
    if (!client) {
      throw new SmtpError('Invalid SMTP client provided to SMTPEmailService', {});
    }
    this.transporter = client;
  }

  /**
   * Returns the service name identifier for this infrastructure service
   *
   * @returns {'email'} Service name identifier
   */
  serviceName(): 'email' {
    return 'email';
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
   * Sends an email to a recipient
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
    await this.circuitBreaker.execute(() =>
      this.transporter
        .sendMail({
          from: this.driver.config().from,
          to,
          subject,
          html: body,
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
