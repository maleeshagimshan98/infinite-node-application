/**
 * Email Service Factory
 *
 * Factory for creating email service implementations based on provider type.
 * Supports multiple email providers (SMTP, SendGrid, AWS SES, etc.).
 */

import type { IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { isSmtpOutage } from '@/infrastructure/email/smtp/error/smtp-error.guards';

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
export class EmailServiceFactory implements IServiceFactory<IEmailService> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'emailService'} Service registration name
   */
  name(): 'emailService' {
    return 'emailService';
  }

  /**
   * Creates an SMTP email service instance whose sends are guarded by a circuit breaker
   *
   * @returns {Promise<IEmailService>} An SMTP email service instance
   * @throws {RangeError} If the configured circuit breaker threshold or reset timeout is invalid
   */
  async createSMTPEmailService(): Promise<IEmailService> {
    const driver = await smtpDriverLoader();
    const circuitBreaker = new CircuitBreaker({
      name: 'smtp',
      ...driver.config().circuitBreaker,
      isFailure: isSmtpOutage,
    });
    return new SMTPEmailService(driver, circuitBreaker);
  }

  /**
   * Creates an email service instance based on the configured email driver type
   *
   * @returns {Promise<IEmailService>} An email service instance
   * @throws {InfrastructureError} If the email type is not supported
   *
   * @example
   * ```typescript
   * const factory = new EmailServiceFactory();
   * const email = await factory.create();
   * ```
   */
  async create(): Promise<IEmailService> {
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
