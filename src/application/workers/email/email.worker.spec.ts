/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmailJobData, IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { IQueue, Job } from '@/application/interfaces/infrastructure/queue.interface';

import { EmailWorker } from './email.worker';

const QUEUE_NAME = 'test-email-queue';

const job: Job<IEmailJobData> = {
  id: '1',
  data: {
    id: '64b7f0c2a1b2c3d4e5f60719',
    user_id: '64b7f0c2a1b2c3d4e5f60718',
    to: ['user@example.com'],
    cc: [],
    bcc: [],
    subject: 'Verify your email',
    body: 'Your verification code is: 123456',
    ttl: 3600,
  },
  attemptsMade: 0,
  timestamp: 0,
};

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
 * Build an email service whose every method is a jest mock, using the test queue name.
 *
 * @returns {jest.Mocked<IEmailService>} The mocked email service.
 */
function mockEmailService(): jest.Mocked<IEmailService> {
  return {
    serviceName: jest.fn(),
    singleton: jest.fn(),
    deferred: jest.fn(),
    getDriver: jest.fn(),
    sendEmail: jest.fn(),
    emailQueueName: jest.fn().mockReturnValue(QUEUE_NAME),
    enqueueEmail: jest.fn(),
    deliverQueuedEmail: jest.fn(),
  };
}

describe('EmailWorker', () => {
  let queue: jest.Mocked<IQueue>;
  let emailService: jest.Mocked<IEmailService>;
  let worker: EmailWorker;

  beforeEach(() => {
    queue = mockQueue();
    emailService = mockEmailService();
    worker = new EmailWorker(queue, emailService);
  });

  it('hands every job on the email queue to the email service', async () => {
    await worker.init();

    expect(queue.processJobs).toHaveBeenCalledWith(QUEUE_NAME, expect.any(Function));
    const processor = queue.processJobs.mock.calls[0]?.[1];
    await processor?.(job);
    expect(emailService.deliverQueuedEmail).toHaveBeenCalledWith(job);
  });

  it('lets a failed delivery reach the queue so the job is retried', async () => {
    const failure = new Error('SMTP is unreachable');
    emailService.deliverQueuedEmail.mockRejectedValue(failure);

    await worker.init();

    const processor = queue.processJobs.mock.calls[0]?.[1];
    await expect(processor?.(job)).rejects.toBe(failure);
  });

  it("closes the email queue's workers on shutdown", async () => {
    await worker.shutdown();

    expect(queue.closeWorkers).toHaveBeenCalledWith(QUEUE_NAME);
  });
});
