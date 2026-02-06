/**
 * Email Service Factory
 *
 * Factory for creating email service implementations based on provider type.
 * Supports multiple email providers (placeholder, Nodemailer, SendGrid, AWS SES, etc.).
 */

import type { IEmail } from '../../application/interfaces/email.interface';
import { SMTPEmailService } from './smtp/smtp-email.service';

/**
 * Factory class for creating email service instances
 *
 * @class EmailServiceFactory
 *
 * @example
 * ```typescript
 * // Using the core driver
 * const emailDriver = emailService.service();
 * const email = EmailServiceFactory.createPlaceholderEmailService(emailDriver);
 *
 * // Using the generic factory method
 * const email = EmailServiceFactory.create('placeholder', emailDriver);
 * ```
 */
export class EmailServiceFactory {
  /**
   * Creates a placeholder email service instance
   *
   * @param {unknown} driver - The email driver (placeholder)
   * @returns {IEmail} A placeholder email service instance
   */
  static createPlaceholderEmailService(driver: unknown): IEmail {
    return new SMTPEmailService(driver);
  }

  /**
   * Creates an email service instance based on the specified type
   *
   * @param {string} emailType - The type of email provider ('placeholder', 'nodemailer', 'sendgrid', 'ses', etc.)
   * @param {unknown} driver - The email driver instance
   * @returns {IEmail} An email service instance
   * @throws {Error} If the email type is not supported
   *
   * @example
   * ```typescript
   * const email = EmailServiceFactory.create('placeholder', emailDriver);
   * ```
   */
  static create(emailType: string, driver: unknown): IEmail {
    switch (emailType.toLowerCase()) {
      case 'placeholder':
      case 'console':
        return this.createPlaceholderEmailService(driver);

      // Future provider support:
      // case 'nodemailer':
      //   return this.createNodemailerEmailService(driver as Transporter);
      //
      // case 'sendgrid':
      //   return this.createSendGridEmailService(driver as SendGridClient);
      //
      // case 'ses':
      // case 'aws-ses':
      //   return this.createSESEmailService(driver as SESClient);
      //
      // case 'mailgun':
      //   return this.createMailgunEmailService(driver as MailgunClient);

      default:
        throw new Error(`Unsupported email type: ${emailType}`);
    }
  }
}
