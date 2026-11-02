/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue } from '@/application/interfaces/infrastructure/queue.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { EmailServiceFactory } from './email-service.factory';
import { SESEmailService } from './ses/ses-email.service';
import * as smtpDriverLoaderModule from './smtp/driver/smtp.driver.loader';
import { SMTPEmailService } from './smtp/smtp-email.service';

const EMAIL_ENV = ['EMAIL_DRIVER', 'EMAIL_FROM', 'EMAIL_SES_REGION'];

/**
 * Build a queue whose every method is a jest mock.
 *
 * @returns {jest.Mocked<IQueue>} The mocked queue.
 */
function mockQueue(): jest.Mocked<IQueue> {
  return {
    serviceName: jest.fn(),
    singleton: jest.fn(),
    deferred: jest.fn(),
    getDriver: jest.fn(),
    hasQueue: jest.fn(),
    newQueue: jest.fn(),
    addJob: jest.fn(),
    processJobs: jest.fn(),
    closeWorkers: jest.fn(),
    retryJobs: jest.fn(),
    getJobStatus: jest.fn(),
  };
}

/**
 * Build a logger whose every method is a jest mock.
 *
 * @returns {jest.Mocked<ILogger>} The mocked logger.
 */
function mockLogger(): jest.Mocked<ILogger> {
  return {
    serviceName: jest.fn(),
    singleton: jest.fn(),
    deferred: jest.fn(),
    getDriver: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logWarn: jest.fn(),
  };
}

/**
 * Create the email service the way the InfrastructureManager does: call the factory, then build the service from
 * the closure it returns.
 *
 * @returns {Promise<IEmailService>} The email service.
 */
async function buildEmailService(): Promise<IEmailService> {
  const created = await new EmailServiceFactory().create();
  return typeof created === 'function' ? created(mockQueue(), mockLogger()) : created;
}

describe('EmailServiceFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of EMAIL_ENV) {
      delete process.env[name];
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each(['ses', 'aws-ses', 'SES'])('builds the SES email service for EMAIL_DRIVER=%s', async (driver) => {
    process.env.EMAIL_DRIVER = driver;
    process.env.EMAIL_FROM = 'noreply@example.com';
    process.env.EMAIL_SES_REGION = 'eu-west-1';

    const service = await buildEmailService();

    expect(service).toBeInstanceOf(SESEmailService);
  });

  it('fails to build the SES email service without EMAIL_FROM', async () => {
    process.env.EMAIL_DRIVER = 'ses';
    process.env.EMAIL_SES_REGION = 'eu-west-1';

    await expect(new EmailServiceFactory().create()).rejects.toBeInstanceOf(RangeError);
  });

  it.each([['smtp'], [undefined]])('builds the SMTP email service for EMAIL_DRIVER=%s', async (driver) => {
    if (driver) {
      process.env.EMAIL_DRIVER = driver;
    }
    const smtpDriverLoader = jest.spyOn(smtpDriverLoaderModule, 'smtpDriverLoader');

    const service = await buildEmailService();

    expect(service).toBeInstanceOf(SMTPEmailService);
    expect(smtpDriverLoader).toHaveBeenCalledTimes(1);
  });

  it.each(['console', 'placeholder', 'mailgun'])(
    'rejects EMAIL_DRIVER=%s without building the SMTP driver',
    async (driver) => {
      process.env.EMAIL_DRIVER = driver;
      const smtpDriverLoader = jest.spyOn(smtpDriverLoaderModule, 'smtpDriverLoader');

      const thrown = await new EmailServiceFactory().create().catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(InfrastructureError);
      expect(thrown).toMatchObject({ type: 'DRIVER_ERROR', data: { emailType: driver } });
      expect(smtpDriverLoader).not.toHaveBeenCalled();
    },
  );
});
