/**
 * Email Service Factory
 *
 * Factory for creating email service implementations based on provider type.
 * Supports SMTP and AWS SES.
 */

import type { IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue } from '@/application/interfaces/infrastructure/queue.interface';
import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { EmailLoggerService } from '@/infrastructure/email/email-log/email-logger.service';
import { isSesOutage } from '@/infrastructure/email/ses/error/ses-error.guards';
import { isSmtpOutage } from '@/infrastructure/email/smtp/error/smtp-error.guards';

import { SESEmailService } from './ses/ses-email.service';
import { sesDriverLoader } from './ses/driver/ses.driver.loader';
import { SMTPEmailService } from './smtp/smtp-email.service';
import { smtpDriverLoader } from './smtp/driver/smtp.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory, ServiceClosure } from '../core/interfaces/service.factory.interface';

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
   * Creates a closure that builds the SMTP email service from the queue and logger services. Sends are guarded by
   * a circuit breaker.
   *
   * @returns {Promise<ServiceClosure<IEmailService>>} A closure building an SMTP email service instance
   * @throws {RangeError} If the configured circuit breaker or email queue settings are invalid
   */
  async createSMTPEmailService(): Promise<ServiceClosure<IEmailService>> {
    const driver = await smtpDriverLoader();
    const circuitBreaker = new CircuitBreaker({
      name: 'smtp',
      ...driver.config().circuitBreaker,
      isFailure: isSmtpOutage,
    });
    return (queue: IQueue, logger: ILogger): IEmailService =>
      new SMTPEmailService(driver, circuitBreaker, queue, new EmailLoggerService(), logger);
  }

  /**
   * Creates a closure that builds the AWS SES email service from the queue and logger services. Sends are guarded
   * by a circuit breaker that counts only outages, not messages SES refuses.
   *
   * @returns {Promise<ServiceClosure<IEmailService>>} A closure building an SES email service instance
   * @throws {RangeError} If EMAIL_FROM is not set, or the configured circuit breaker or email queue settings are
   * invalid
   * @throws {DriverError} If no AWS region is configured
   */
  async createSESEmailService(): Promise<ServiceClosure<IEmailService>> {
    const driver = await sesDriverLoader();
    const circuitBreaker = new CircuitBreaker({
      name: 'aws_ses',
      ...driver.config().circuitBreaker,
      isFailure: isSesOutage,
    });
    return (queue: IQueue, logger: ILogger): IEmailService =>
      new SESEmailService(driver, circuitBreaker, queue, new EmailLoggerService(), logger);
  }

  /**
   * Creates an email service, or a closure building it, based on the configured email driver type
   *
   * @returns {Promise<IEmailService | ServiceClosure<IEmailService>>} An email service instance, or a closure that
   * builds one from the infrastructure services it depends on
   * @throws {InfrastructureError} If the email type is not supported
   * @throws {RangeError} If the configured driver, circuit breaker or email queue settings are invalid
   * @throws {DriverError} If the SES driver is selected and no AWS region is configured
   *
   * @example
   * ```typescript
   * const factory = new EmailServiceFactory();
   * const email = await factory.create();
   * ```
   */
  async create(): Promise<IEmailService | ServiceClosure<IEmailService>> {
    const emailType = process.env.EMAIL_DRIVER || 'smtp';
    switch (emailType.toLowerCase()) {
      case 'smtp':
        return await this.createSMTPEmailService();
      case 'aws-ses':
        return await this.createSESEmailService();

      // Future provider support:
      // case 'sendgrid':
      //   return new SendGridEmailService();
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
