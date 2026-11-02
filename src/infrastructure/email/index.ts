/**
 * Email Infrastructure Module
 *
 * Barrel export for email service implementations and factory.
 */

export { SMTPEmailService } from './smtp/smtp-email.service';
export { SESEmailService } from './ses/ses-email.service';
export { EmailServiceFactory } from './email-service.factory';
