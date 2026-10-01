/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmail } from '@/application/interfaces/email.interface';

import { SmtpError } from './error/smtp.error';

import type { SMTPDriver } from './driver/smtp.driver';
import type { Transporter } from 'nodemailer';

/**
 * SMTP Email Service Implementation
 *
 * Provides email functionality using SMTP protocol.
 * This implementation manages its own driver instance internally.
 *
 * @class SMTPEmailService
 * @implements {IEmail}
 *
 * @example
 * ```typescript
 * const emailService = new SMTPEmailService();
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
   * Creates an instance of SMTPEmailService
   * Instantiates and initializes the SMTP driver internally
   */
  constructor(driver: SMTPDriver) {
    this.driver = driver;
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
   * Sends an email to a recipient
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} body - Email body content (HTML or plain text)
   * @returns {Promise<void>} resolving when the email has been handed off to the SMTP transport
   * @throws {SmtpError} EMAIL_SEND_ERROR when the SMTP transport fails to send the email
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
    await this.transporter
      .sendMail({
        from: this.driver.config().from,
        to,
        subject,
        html: body,
      })
      .catch((error: unknown) => {
        throw new SmtpError(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          cause: error,
        });
      });
  }
}
