/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmail } from '@/application/interfaces/email.interface';

import type { SMTPDriver } from './driver/smtp.driver';

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
   * Creates an instance of SMTPEmailService
   * Instantiates and initializes the SMTP driver internally
   */
  constructor(driver: SMTPDriver) {
    this.driver = driver;
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
   * @returns {unknown} The SMTP driver instance
   */
  getDriver(): unknown {
    return this.driver.client();
  }

  /**
   * Sends an email to a recipient
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} body - Email body content (HTML or plain text)
   * @returns {Promise<void>}
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
    // Placeholder implementation - log to console
    console.log('[Placeholder Email] Sending email:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body}`);

    // TODO: Replace with actual email provider implementation
    // Example with Nodemailer:
    // await this.driver.sendMail({
    //   to,
    //   subject,
    //   html: body,
    // });
    //
    // Example with SendGrid:
    // await this.driver.send({
    //   to,
    //   subject,
    //   html: body,
    // });
  }
}
