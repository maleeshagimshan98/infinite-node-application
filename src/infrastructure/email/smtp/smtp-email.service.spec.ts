/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';
import nodemailer from 'nodemailer';

import type { IEmailJobData } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue, Job } from '@/application/interfaces/infrastructure/queue.interface';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import { Email, NewEmail } from '@/domain/app/email/models/email';
import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';
import { EmailLoggerService } from '@/infrastructure/email/email-log/email-logger.service';
import { QueueError } from '@/infrastructure/queue/errors/queue.error';

import { SMTPDriver } from './driver/smtp.driver';
import { smtpConfig } from './driver/smtp.config';
import { isSmtpOutage } from './error/smtp-error.guards';
import { SmtpError } from './error/smtp.error';
import { SMTPEmailService } from './smtp-email.service';

import type { Transporter } from 'nodemailer';

// jsonTransport never opens a connection; every send these tests make is stubbed anyway.
const transporter: Transporter = nodemailer.createTransport({ jsonTransport: true });

class StubSMTPDriver extends SMTPDriver {
  override client(): Transporter {
    return transporter;
  }
}

const QUEUE_NAME = 'test-email-queue';
const EMAIL_ID = '64b7f0c2a1b2c3d4e5f60719';

const emailData = {
  user_id: '64b7f0c2a1b2c3d4e5f60718',
  to: ['user@example.com'],
  cc: ['cc@example.com'],
  bcc: [],
  subject: 'Verify your email',
  body: 'Your verification code is: 123456',
  ttl: 3600,
};

const jobData: IEmailJobData = { id: EMAIL_ID, ...emailData };

/**
 * Build a queued email job.
 *
 * @param {number} attemptsMade - How many attempts have failed before this one.
 * @returns {Job<IEmailJobData>} The job.
 */
function emailJob(attemptsMade: number): Job<IEmailJobData> {
  return { id: '1', data: jobData, attemptsMade, timestamp: 0 };
}

/**
 * Build the pending log record of the queued email.
 *
 * @returns {Email} The pending email.
 */
function pendingEmail(): Email {
  return new Email({ ...jobData, status: 'pending' });
}

/**
 * Build an error shaped like nodemailer's, carrying its `code`.
 *
 * @param {string} code - The nodemailer error code.
 * @returns {Error & { code: string }} The error.
 */
function nodemailerError(code: string): Error & { code: string } {
  return Object.assign(new Error(`SMTP failure (${code})`), { code });
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
  service: SMTPEmailService;
  breaker: CircuitBreaker;
  queue: jest.Mocked<IQueue>;
  repository: jest.Mocked<IEmailRepository>;
  logger: jest.Mocked<ILogger>;
}

/**
 * Create the service with a breaker that opens on the first counted failure, a queue that retries three times, and
 * an email log over a mocked repository.
 *
 * @returns {ITestService} The service and its collaborators.
 */
function createService(): ITestService {
  const breaker = new CircuitBreaker({
    name: 'smtp',
    failureThreshold: 0,
    resetTimeout: 1000,
    isFailure: isSmtpOutage,
  });
  const driver = new StubSMTPDriver({
    ...smtpConfig(),
    queue: { name: QUEUE_NAME, attempts: 3, retryDelay: 1000, backoff: 'exponential' },
  });
  const queue = mockQueue();
  const repository = mockRepository();
  const logger = mockLogger();
  const service = new SMTPEmailService(driver, breaker, queue, new EmailLoggerService(repository), logger);
  return { service, breaker, queue, repository, logger };
}

describe('SMTPEmailService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('wraps a transport failure in an SmtpError carrying the nodemailer code and the original as data.cause', async () => {
    const failure = nodemailerError('ECONNECTION');
    jest.spyOn(transporter, 'sendMail').mockImplementation((): Promise<never> => Promise.reject(failure));
    const { service } = createService();

    const thrown = await service.sendEmail('user@example.com', 'Subject', 'Body').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(SmtpError);
    expect(thrown).toMatchObject({ type: 'EMAIL_ERROR', data: { code: 'ECONNECTION', cause: failure } });
  });

  it('stops calling the SMTP server once a connection failure opens the circuit', async () => {
    const sendMail = jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation((): Promise<never> => Promise.reject(nodemailerError('ECONNECTION')));
    const { service, breaker } = createService();

    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SmtpError);
    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(CircuitOpenError);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(breaker.state).toBe('open');
  });

  it('keeps the circuit closed when the server rejects the message itself', async () => {
    const sendMail = jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation((): Promise<never> => Promise.reject(nodemailerError('EENVELOPE')));
    const { service, breaker } = createService();

    await expect(service.sendEmail('bad@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SmtpError);
    await expect(service.sendEmail('bad@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SmtpError);

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(breaker.state).toBe('closed');
  });

  it('reports its single circuit breaker for the health check, even while closed', () => {
    const { service } = createService();

    expect(service.circuitBreakerStatuses()).toEqual([
      { name: 'smtp', state: 'closed', failureCount: 0, failureThreshold: 0 },
    ]);
  });

  it('reports the configured email queue name', () => {
    const { service } = createService();

    expect(service.emailQueueName()).toBe(QUEUE_NAME);
  });

  describe('enqueueEmail', () => {
    it('queues the whole email under a generated id with the configured retries, without writing the log', async () => {
      const { service, queue, repository } = createService();

      const id = await service.enqueueEmail(new NewEmail({ ...emailData, status: 'pending' }));

      expect(Types.ObjectId.isValid(id)).toBe(true);
      expect(queue.addJob).toHaveBeenCalledWith(
        QUEUE_NAME,
        { ...emailData, id },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: true },
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("keeps an email's own id", async () => {
      const { service, queue } = createService();

      const id = await service.enqueueEmail(new NewEmail({ ...jobData, status: 'pending' }));

      expect(id).toBe(EMAIL_ID);
      expect(queue.addJob).toHaveBeenCalledWith(QUEUE_NAME, jobData, expect.any(Object));
    });

    it('creates the email queue only when it does not exist yet', async () => {
      const { service, queue } = createService();
      queue.hasQueue.mockReturnValueOnce(false).mockReturnValueOnce(true);

      await service.enqueueEmail(new NewEmail({ ...emailData, status: 'pending' }));
      await service.enqueueEmail(new NewEmail({ ...emailData, status: 'pending' }));

      expect(queue.hasQueue).toHaveBeenCalledWith(QUEUE_NAME);
      expect(queue.newQueue).toHaveBeenCalledTimes(1);
      expect(queue.newQueue).toHaveBeenCalledWith(QUEUE_NAME);
    });

    it('logs the email as failed, without its body, and rethrows when it cannot be queued', async () => {
      const { service, queue, repository } = createService();
      const failure = new QueueError('Redis is unreachable');
      queue.addJob.mockRejectedValue(failure);

      await expect(service.enqueueEmail(new NewEmail({ ...jobData, status: 'pending' }))).rejects.toBe(failure);

      const logged = repository.create.mock.calls[0]?.[0];
      expect(logged?.id).toBe(EMAIL_ID);
      expect(logged?.status).toBe('failed');
      expect(logged?.body).toBe('');
      expect(logged?.error_message).toBe('Could not be queued: Redis is unreachable');
    });

    it('still rethrows the queue error when the failed email cannot be logged either', async () => {
      const { service, queue, repository, logger } = createService();
      const failure = new QueueError('Redis is unreachable');
      queue.addJob.mockRejectedValue(failure);
      repository.create.mockRejectedValue(new InfrastructureError('MongoDB is unreachable', 'CONNECTION_ERROR'));

      await expect(service.enqueueEmail(new NewEmail({ ...jobData, status: 'pending' }))).rejects.toBe(failure);

      expect(logger.logError).toHaveBeenCalledTimes(1);
    });

    it('rejects an email that is not pending and queues nothing', async () => {
      const { service, queue } = createService();
      const failed = new NewEmail({ ...emailData, body: '', status: 'failed', error_message: 'Rejected' });

      await expect(service.enqueueEmail(failed)).rejects.toBeInstanceOf(RangeError);

      expect(queue.addJob).not.toHaveBeenCalled();
    });
  });

  describe('deliverQueuedEmail', () => {
    it('logs the email as pending before sending it, then marks it sent without its body', async () => {
      const { service, repository } = createService();
      repository.findById.mockResolvedValue(null);
      repository.create.mockResolvedValue(pendingEmail());
      repository.update.mockResolvedValue(pendingEmail());
      const sendMail = jest.spyOn(transporter, 'sendMail').mockImplementation((): Promise<void> => Promise.resolve());

      await service.deliverQueuedEmail(emailJob(0));

      const logged = repository.create.mock.calls[0]?.[0];
      expect(logged?.id).toBe(EMAIL_ID);
      expect(logged?.status).toBe('pending');
      expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(sendMail.mock.invocationCallOrder[0] ?? 0);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          html: emailData.body,
        }),
      );
      const saved = repository.update.mock.calls[0];
      expect(saved?.[0]).toBe(EMAIL_ID);
      expect(saved?.[1].status).toBe('sent');
      expect(saved?.[1].body).toBe('');
    });

    it('reuses the record an earlier attempt logged', async () => {
      const { service, repository } = createService();
      repository.findById.mockResolvedValue(pendingEmail());
      repository.update.mockResolvedValue(pendingEmail());
      const sendMail = jest.spyOn(transporter, 'sendMail').mockImplementation((): Promise<void> => Promise.resolve());

      await service.deliverQueuedEmail(emailJob(1));

      expect(repository.create).not.toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('reads the record again when another run of the job logged it first', async () => {
      const { service, repository } = createService();
      repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(pendingEmail());
      repository.create.mockRejectedValue(new RepositoryError('E11000 duplicate key', 'DUPLICATE_KEY'));
      repository.update.mockResolvedValue(pendingEmail());
      const sendMail = jest.spyOn(transporter, 'sendMail').mockImplementation((): Promise<void> => Promise.resolve());

      await service.deliverQueuedEmail(emailJob(0));

      expect(repository.findById).toHaveBeenCalledTimes(2);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('sends nothing and rethrows when the email cannot be logged, so the job is retried', async () => {
      const { service, repository, logger } = createService();
      const failure = new InfrastructureError('MongoDB is unreachable', 'CONNECTION_ERROR');
      repository.findById.mockResolvedValue(null);
      repository.create.mockRejectedValue(failure);
      const sendMail = jest.spyOn(transporter, 'sendMail');

      await expect(service.deliverQueuedEmail(emailJob(0))).rejects.toBe(failure);

      expect(sendMail).not.toHaveBeenCalled();
      expect(logger.logError).not.toHaveBeenCalled();
    });

    it('sends nothing and rethrows when the log cannot be read', async () => {
      const { service, repository } = createService();
      const failure = new InfrastructureError('MongoDB is unreachable', 'CONNECTION_ERROR');
      repository.findById.mockRejectedValue(failure);
      const sendMail = jest.spyOn(transporter, 'sendMail');

      await expect(service.deliverQueuedEmail(emailJob(0))).rejects.toBe(failure);

      expect(sendMail).not.toHaveBeenCalled();
    });

    it('reports an email that still cannot be logged on its last attempt', async () => {
      const { service, repository, logger } = createService();
      const failure = new InfrastructureError('MongoDB is unreachable', 'CONNECTION_ERROR');
      repository.findById.mockRejectedValue(failure);

      await expect(service.deliverQueuedEmail(emailJob(2))).rejects.toBe(failure);

      expect(logger.logError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ emailId: EMAIL_ID, error: failure }),
      );
    });

    it('rethrows a send failure before the last attempt and leaves the email pending', async () => {
      const { service, repository } = createService();
      repository.findById.mockResolvedValue(pendingEmail());
      jest
        .spyOn(transporter, 'sendMail')
        .mockImplementation((): Promise<never> => Promise.reject(nodemailerError('ECONNECTION')));

      await expect(service.deliverQueuedEmail(emailJob(1))).rejects.toBeInstanceOf(SmtpError);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('marks the email failed without its body on the last attempt, and rethrows', async () => {
      const { service, repository, logger } = createService();
      repository.findById.mockResolvedValue(pendingEmail());
      repository.update.mockResolvedValue(pendingEmail());
      jest
        .spyOn(transporter, 'sendMail')
        .mockImplementation((): Promise<never> => Promise.reject(nodemailerError('ECONNECTION')));

      await expect(service.deliverQueuedEmail(emailJob(2))).rejects.toBeInstanceOf(SmtpError);

      const saved = repository.update.mock.calls[0]?.[1];
      expect(saved?.status).toBe('failed');
      expect(saved?.body).toBe('');
      expect(saved?.error_message).toBe('Failed to send email: SMTP failure (ECONNECTION)');
      expect(logger.logError).toHaveBeenCalledTimes(1);
    });

    it('does not send an email that is no longer pending', async () => {
      const { service, repository, logger } = createService();
      repository.findById.mockResolvedValue(new Email({ ...jobData, body: '', status: 'sent', sent_on: new Date() }));
      const sendMail = jest.spyOn(transporter, 'sendMail');

      await service.deliverQueuedEmail(emailJob(0));

      expect(sendMail).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(logger.logWarn).toHaveBeenCalledTimes(1);
    });

    it('logs instead of rethrowing when a sent email cannot be marked sent, so it is not sent again', async () => {
      const { service, repository, logger } = createService();
      repository.findById.mockResolvedValue(pendingEmail());
      repository.update.mockRejectedValue(new InfrastructureError('MongoDB is unreachable', 'CONNECTION_ERROR'));
      const sendMail = jest.spyOn(transporter, 'sendMail').mockImplementation((): Promise<void> => Promise.resolve());

      await expect(service.deliverQueuedEmail(emailJob(0))).resolves.toBeUndefined();

      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(logger.logError).toHaveBeenCalledTimes(1);
    });
  });
});

describe('isSmtpOutage', () => {
  it.each(['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'EAUTH'])('counts an SmtpError with code %s', (code) => {
    expect(isSmtpOutage(new SmtpError('failed', { code }))).toBe(true);
  });

  it.each(['EENVELOPE', 'EMESSAGE'])('does not count an SmtpError with code %s', (code) => {
    expect(isSmtpOutage(new SmtpError('rejected', { code }))).toBe(false);
  });

  it('counts an SmtpError without a code', () => {
    expect(isSmtpOutage(new SmtpError('failed', {}))).toBe(true);
  });

  it('does not count an error that is not an SmtpError', () => {
    expect(isSmtpOutage(nodemailerError('ECONNECTION'))).toBe(false);
  });
});
