/**
 * Email Service Factory
 *
 * Factory for creating email service implementations based on provider type.
 * Supports multiple email providers (SMTP, SendGrid, AWS SES, etc.).
 */

import type { IEmail } from '@/application/interfaces/email.interface';

import { SMTPEmailService } from './smtp/smtp-email.service';
import { smtpDriverLoader } from './smtp/driver/smtp.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

/**
 * Factory class for creating email service instances
 *
 * @class EmailServiceFactory
 *
 * @example
 * ```typescript
 * const factory = new EmailServiceFactory();
 * const email = await factory.create();
 * ```
 */
export class EmailServiceFactory implements IServiceFactory<IEmail> {
  /**
   * Creates an SMTP email service instance
   *
   * @returns {Promise<IEmail>} An SMTP email service instance
   */
  async createSMTPEmailService(): Promise<IEmail> {
    return new SMTPEmailService(await smtpDriverLoader());
  }

  /**
   * Creates an email service instance based on the configured email driver type
   *
   * @returns {Promise<IEmail>} An email service instance
   * @throws {InfrastructureError} If the email type is not supported
   *
   * @example
   * ```typescript
   * const factory = new EmailServiceFactory();
   * const email = await factory.create();
   * ```
   */
  async create(): Promise<IEmail> {
    const emailType = process.env.EMAIL_DRIVER || 'smtp';
    switch (emailType.toLowerCase()) {
      case 'smtp':
        return await this.createSMTPEmailService();
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
        throw new InfrastructureError(`Unsupported email type: ${emailType}`, 'DRIVER_ERROR', {
          emailType,
        });
    }
  }
}
