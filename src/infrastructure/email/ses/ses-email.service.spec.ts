/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import {
  MailFromDomainNotVerifiedException,
  MessageRejected,
  SendEmailCommand,
  SESv2Client,
  SESv2ServiceException,
} from '@aws-sdk/client-sesv2';

import type { IEmailJobData } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue, Job } from '@/application/interfaces/infrastructure/queue.interface';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import { Email } from '@/domain/app/email/models/email';
import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';
import { EmailLoggerService } from '@/infrastructure/email/email-log/email-logger.service';

import { SESDriver } from './driver/ses.driver';
import { isSesOutage } from './error/ses-error.guards';
import { SesError } from './error/ses.error';
import { SESEmailService } from './ses-email.service';

import type { ISESConfig } from './driver/ses.config';
import type { SendEmailCommandOutput } from '@aws-sdk/client-sesv2';

// Every send these tests make is stubbed; the client never opens a connection.
const client = new SESv2Client({ region: 'us-east-1' });

class StubSESDriver extends SESDriver {
  override client(): SESv2Client {
    return client;
  }
}

const QUEUE_NAME = 'test-email-queue';
const EMAIL_ID = '64b7f0c2a1b2c3d4e5f60719';
const FROM = 'noreply@example.com';

const config: ISESConfig = {
  driverName: 'email',
  singleton: true,
  deferred: true,
  region: 'us-east-1',
  from: FROM,
  connectionTimeout: 1000,
  requestTimeout: 1000,
  circuitBreaker: { failureThreshold: 0, resetTimeout: 1000 },
  queue: { name: QUEUE_NAME, attempts: 3, retryDelay: 1000, backoff: 'exponential' },
};

const jobData: IEmailJobData = {
  id: EMAIL_ID,
  user_id: '64b7f0c2a1b2c3d4e5f60718',
  to: ['user@example.com'],
  cc: ['cc@example.com'],
  bcc: [],
  subject: 'Verify your email',
  body: 'Your verification code is: 123456',
  ttl: 3600,
};

/**
 * Build the SES answer to an accepted email.
 *
 * @returns {Promise<SendEmailCommandOutput>} The resolved output.
 */
function accepted(): Promise<SendEmailCommandOutput> {
  return Promise.resolve({ MessageId: 'message-1', $metadata: { httpStatusCode: 200 } });
}

/**
 * Build the error SES returns for a message with an unverified address.
 *
 * @returns {MessageRejected} The client-fault exception.
 */
function messageRejected(): MessageRejected {
  return new MessageRejected({
    message: 'Email address is not verified.',
    $metadata: { httpStatusCode: 400, requestId: 'request-1' },
  });
}

/**
 * Build an error shaped like Node's for a refused connection.
 *
 * @returns {Error & { code: string }} The error.
 */
function connectionRefused(): Error & { code: string } {
  return Object.assign(new Error('connect ECONNREFUSED 52.0.0.1:443'), { code: 'ECONNREFUSED' });
}

/**
 * Build a queue whose every method is a jest mock; the email queue exists.
 *
 * @returns {jest.Mocked<IQueue>} The mocked queue.
 */
function mockQueue(): jest.Mocked<IQueue> {
  return {
    serviceName: jest.fn(),
    singleton: jest.fn(),
    deferred: jest.fn(),
    getDriver: jest.fn(),
    hasQueue: jest.fn().mockReturnValue(true),
    newQueue: jest.fn(),
    addJob: jest.fn(),
    processJobs: jest.fn(),
    closeWorkers: jest.fn(),
    retryJobs: jest.fn(),
    getJobStatus: jest.fn(),
  };
}

/**
 * Build an email repository whose every method is a jest mock.
 *
 * @returns {jest.Mocked<IEmailRepository>} The mocked repository.
 */
function mockRepository(): jest.Mocked<IEmailRepository> {
  return {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

interface ITestService {
  service: SESEmailService;
  breaker: CircuitBreaker;
  repository: jest.Mocked<IEmailRepository>;
}

/**
 * Create the service with a breaker that opens on the first counted failure, and an email log over a mocked
 * repository.
 *
 * @returns {ITestService} The service and its collaborators.
 */
function createService(): ITestService {
  const breaker = new CircuitBreaker({ name: 'ses', ...config.circuitBreaker, isFailure: isSesOutage });
  const repository = mockRepository();
  const service = new SESEmailService(
    new StubSESDriver(config),
    breaker,
    mockQueue(),
    new EmailLoggerService(repository),
    mockLogger(),
  );
  return { service, breaker, repository };
}

describe('SESEmailService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('refuses a driver whose client is not initialized', () => {
    expect(
      () =>
        new SESEmailService(
          new SESDriver(config),
          createService().breaker,
          mockQueue(),
          new EmailLoggerService(mockRepository()),
          mockLogger(),
        ),
    ).toThrow(SesError);
  });

  it('sends an HTML email from the configured sender, leaving out empty recipient lists', async () => {
    const send = jest.spyOn(client, 'send').mockImplementation(accepted);
    const { service } = createService();

    await service.sendEmail('user@example.com', 'Subject', '<p>Body</p>');

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(SendEmailCommand);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          FromEmailAddress: FROM,
          Destination: { ToAddresses: ['user@example.com'] },
          Content: {
            Simple: {
              Subject: { Data: 'Subject', Charset: 'UTF-8' },
              Body: { Html: { Data: '<p>Body</p>', Charset: 'UTF-8' } },
            },
          },
        },
      }),
    );
  });

  it('wraps a rejection in an SesError carrying only safe fields of the SDK error', async () => {
    const rejected = messageRejected();
    rejected.$response = { statusCode: 400, headers: { 'x-amzn-requestid': 'request-1' }, body: undefined };
    jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(rejected));
    const { service } = createService();

    const thrown = await service.sendEmail('user@example.com', 'Subject', 'Body').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(SesError);
    expect(thrown).toMatchObject({
      type: 'EMAIL_ERROR',
      data: { code: 'MessageRejected', fault: 'client', httpStatusCode: 400, requestId: 'request-1' },
    });
    const cause = thrown instanceof SesError ? thrown.data?.cause : undefined;
    expect(cause).toBeInstanceOf(Error);
    expect(cause).not.toBe(rejected);
    expect(cause).toMatchObject({ name: 'MessageRejected', message: 'Email address is not verified.' });
    expect(cause).not.toHaveProperty('$response');
    expect(cause).not.toHaveProperty('$metadata');
  });

  it.each([
    ['a refused connection', connectionRefused(), 'ECONNREFUSED'],
    ['a timeout', Object.assign(new Error('Request timed out'), { name: 'TimeoutError' }), 'TimeoutError'],
  ])('wraps %s in an SesError without a fault', async (_label, failure, code) => {
    jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(failure));
    const { service } = createService();

    const thrown = await service.sendEmail('user@example.com', 'Subject', 'Body').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(SesError);
    expect(thrown).toMatchObject({ type: 'EMAIL_ERROR', data: { code, fault: undefined } });
  });

  it('stops calling SES once a connection failure opens the circuit', async () => {
    const send = jest
      .spyOn(client, 'send')
      .mockImplementation((): Promise<never> => Promise.reject(connectionRefused()));
    const { service, breaker } = createService();

    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SesError);
    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(CircuitOpenError);

    expect(send).toHaveBeenCalledTimes(1);
    expect(breaker.state).toBe('open');
  });

  it('opens the circuit on a server fault', async () => {
    const serverFault = new SESv2ServiceException({
      name: 'InternalFailure',
      $fault: 'server',
      $metadata: { httpStatusCode: 500 },
      message: 'Internal failure',
    });
    jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(serverFault));
    const { service, breaker } = createService();

    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SesError);

    expect(breaker.state).toBe('open');
  });

  it.each([
    ['MessageRejected', messageRejected],
    [
      'MailFromDomainNotVerifiedException',
      (): MailFromDomainNotVerifiedException =>
        new MailFromDomainNotVerifiedException({ message: 'Not verified', $metadata: { httpStatusCode: 400 } }),
    ],
  ])('keeps the circuit closed when SES refuses the message with %s', async (_name, refusal) => {
    const send = jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(refusal()));
    const { service, breaker } = createService();

    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SesError);
    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SesError);

    expect(send).toHaveBeenCalledTimes(2);
    expect(breaker.state).toBe('closed');
  });

  it('reports its single circuit breaker for the health check, even while closed', () => {
    const { service } = createService();

    expect(service.circuitBreakerStatuses()).toEqual([
      { name: 'ses', state: 'closed', failureCount: 0, failureThreshold: 0 },
    ]);
  });

  it('logs a queued email as pending, sends it through SES, then marks it sent', async () => {
    const { service, repository } = createService();
    const pending = (): Email => new Email({ ...jobData, status: 'pending' });
    repository.findById.mockResolvedValue(null);
    repository.create.mockResolvedValue(pending());
    repository.update.mockResolvedValue(pending());
    const send = jest.spyOn(client, 'send').mockImplementation(accepted);
    const job: Job<IEmailJobData> = { id: '1', data: jobData, attemptsMade: 0, timestamp: 0 };

    await service.deliverQueuedEmail(job);

    expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0] ?? 0);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Destination: { ToAddresses: jobData.to, CcAddresses: jobData.cc },
        }),
      }),
    );
    expect(repository.update.mock.calls[0]?.[1].status).toBe('sent');
  });
});

describe('isSesOutage', () => {
  it('counts an SesError without a fault, such as a network error or a timeout', () => {
    expect(isSesOutage(new SesError('failed', { code: 'ECONNREFUSED' }))).toBe(true);
  });

  it('counts an SesError for a server fault', () => {
    expect(isSesOutage(new SesError('failed', { code: 'InternalFailure', fault: 'server' }))).toBe(true);
  });

  it('does not count an SesError for a client fault', () => {
    expect(isSesOutage(new SesError('rejected', { code: 'MessageRejected', fault: 'client' }))).toBe(false);
  });

  it('does not count an error that is not an SesError', () => {
    expect(isSesOutage(connectionRefused())).toBe(false);
  });
});
