/**
 * Email Service Factory
 *
 * Factory for creating email service implementations based on provider type.
 * Supports multiple email providers (SMTP, SendGrid, AWS SES, etc.).
 */

import type { IEmail } from '@/application/interfaces/email.interface';

import { SMTPEmailService } from './smtp/smtp-email.service';
import { smtpDriverLoader } from './smtp/driver/smtp.driver.loader';

/**
 * Factory class for creating email service instances
 *
 * @class EmailServiceFactory
 *
 * @example
 * ```typescript
 * // Create SMTP email service
 * const email = await EmailServiceFactory.createSMTPEmailService();
 *
 * // Using the generic factory method
 * const email = await EmailServiceFactory.create('smtp');
 * ```
 */
export class EmailServiceFactory {
  /**
   * Creates an SMTP email service instance
   *
   * @returns {IEmail} An SMTP email service instance
   */
  static async createSMTPEmailService(): Promise<IEmail> {
    return new SMTPEmailService(await smtpDriverLoader());
  }

  /**
   * Creates an email service instance based on the specified type
   *
   * @returns {IEmail} An email service instance
   * @throws {Error} If the email type is not supported
   *
   * @example
   * ```typescript
   * const email = await EmailServiceFactory.create();

   * ```
   */
  static async create(): Promise<IEmail> {
    const emailType = process.env.EMAIL_DRIVER || 'smtp';
    switch (emailType.toLowerCase()) {
      case 'smtp':
      case 'placeholder':
      case 'console':
        return await this.createSMTPEmailService();

      // Future provider support:
      // case 'sendgrid':
      //   return new SendGridEmailService();
      //
      // case 'ses':
      // case 'aws-ses':
      //   return new SESEmailService();
      //
      // case 'mailgun':
      //   return new MailgunEmailService();

      default:
        throw new Error(`Unsupported email type: ${emailType}`);
    }
  }
}
