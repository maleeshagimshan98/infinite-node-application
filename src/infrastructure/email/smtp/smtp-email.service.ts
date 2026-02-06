/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmail } from '../../../application/interfaces/email.interface';

/**
 * SMTP Email Service Implementation
 *
 * Provides email functionality using console logging for development/testing.
 * This implementation should be replaced with real email providers in production.
 *
 * @class PlaceholderEmailService
 * @implements {IEmail}
 *
 * @example
 * ```typescript
 * const emailDriver = emailService.service(); // unknown placeholder
 * const emailService = new PlaceholderEmailService(emailDriver);
 *
 * await emailService.sendEmail(
 *   'user@example.com',
 *   'Welcome!',
 *   '<h1>Welcome to our service</h1>'
 * );
 * ```
 */
export class SMTPEmailService implements IEmail {
  /**
   * Creates an instance of PlaceholderEmailService
   *
   * @param {unknown} driver - The email driver (placeholder - currently unknown)
   */
  constructor(private readonly driver: unknown) {}

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
