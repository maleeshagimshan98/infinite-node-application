/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Queue } from 'bullmq';

import { BullMQQueueService } from './bullmq-queue.service';
import { QueueDriver } from './driver/bullmq.driver';
import { queueConfig } from './driver/queue.config';
import { QueueError } from '../errors/queue.error';

/**
 * Stand-in for a BullMQ Worker, recording the calls the queue service makes on it.
 */
interface IMockWorker {
  on: jest.Mock;
  waitUntilReady: jest.Mock<Promise<void>, []>;
  close: jest.Mock<Promise<void>, [force?: boolean | undefined]>;
}

// Every Worker the service creates, in creation order.
const mockWorkers: IMockWorker[] = [];
// Shared by every Worker, so a test can make the next waitUntilReady() / close() call fail before the Worker exists.
const mockWaitUntilReady = jest.fn<Promise<void>, []>();
const mockClose = jest.fn<Promise<void>, [force?: boolean | undefined]>();

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({ close: jest.fn(() => Promise.resolve()) })),
  Worker: jest.fn(() => {
    const worker = {
      on: jest.fn(),
      waitUntilReady: jest.fn(() => mockWaitUntilReady()),
      close: jest.fn((force?: boolean) => mockClose(force)),
    };
    mockWorkers.push(worker);
    return worker;
  }),
}));

jest.mock('./driver/bullmq.telemetry', () => ({ bullmqTelemetry: {} }));

class StubQueueDriver extends QueueDriver {
  private readonly defaultQueue: Queue = new Queue('default');

  override client(): Queue {
    return this.defaultQueue;
  }
}

const QUEUE_NAME = 'reports';

/**
 * Process nothing: the tests only exercise the worker lifecycle.
 *
 * @returns {Promise<void>} Resolves immediately.
 */
const processor = async (): Promise<void> => undefined;

describe('BullMQQueueService workers', () => {
  let service: BullMQQueueService;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    // clearAllMocks keeps the implementations of the bullmq factory mocks; resetAllMocks would remove them.
    jest.clearAllMocks();
    mockWorkers.length = 0;
    mockWaitUntilReady.mockReset().mockResolvedValue(undefined);
    mockClose.mockReset().mockResolvedValue(undefined);
    service = new BullMQQueueService(new StubQueueDriver(queueConfig()));
  });

  describe('closeWorkers', () => {
    it('closes every worker started on the queue', async () => {
      await service.processJobs(QUEUE_NAME, processor);
      await service.processJobs(QUEUE_NAME, processor);

      await service.closeWorkers(QUEUE_NAME);

      expect(mockWorkers).toHaveLength(2);
      expect(mockWorkers[0]?.close).toHaveBeenCalledTimes(1);
      expect(mockWorkers[1]?.close).toHaveBeenCalledTimes(1);
    });

    it('still closes the other workers when one fails to close, then throws a QUEUE_ERROR', async () => {
      await service.processJobs(QUEUE_NAME, processor);
      await service.processJobs(QUEUE_NAME, processor);
      const closeFailure = new Error('Connection is closed');
      mockClose.mockRejectedValueOnce(closeFailure);

      const thrown = await service.closeWorkers(QUEUE_NAME).catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(QueueError);
      expect(thrown).toMatchObject({ type: 'QUEUE_ERROR', data: { cause: closeFailure } });
      expect(mockWorkers[1]?.close).toHaveBeenCalledTimes(1);
    });

    it('does not let shutdown() close the workers again, even after a close failure', async () => {
      await service.processJobs(QUEUE_NAME, processor);
      await service.processJobs(QUEUE_NAME, processor);
      mockClose.mockRejectedValueOnce(new Error('Connection is closed'));
      await service.closeWorkers(QUEUE_NAME).catch(() => undefined);

      await service.shutdown();

      expect(mockWorkers[0]?.close).toHaveBeenCalledTimes(1);
      expect(mockWorkers[1]?.close).toHaveBeenCalledTimes(1);
    });

    it('keeps tracking a worker started while the queue is closing, so shutdown() closes it', async () => {
      await service.processJobs(QUEUE_NAME, processor);
      let finishClosing: () => void = () => undefined;
      mockClose.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishClosing = resolve;
        }),
      );

      const closing = service.closeWorkers(QUEUE_NAME);
      await service.processJobs(QUEUE_NAME, processor);
      finishClosing();
      await closing;

      expect(mockWorkers[1]?.close).not.toHaveBeenCalled();

      await service.shutdown();

      expect(mockWorkers[0]?.close).toHaveBeenCalledTimes(1);
      expect(mockWorkers[1]?.close).toHaveBeenCalledTimes(1);
    });

    it('resolves without closing anything for a queue with no workers', async () => {
      await expect(service.closeWorkers('unknown-queue')).resolves.toBeUndefined();

      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('processJobs', () => {
    it('force-closes a worker that fails to start, then throws a QUEUE_ERROR', async () => {
      const startFailure = new Error('connect ECONNREFUSED 127.0.0.1:6379');
      mockWaitUntilReady.mockRejectedValueOnce(startFailure);

      const thrown = await service.processJobs(QUEUE_NAME, processor).catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(QueueError);
      expect(thrown).toMatchObject({ type: 'QUEUE_ERROR', data: { cause: startFailure } });
      expect(mockWorkers[0]?.close).toHaveBeenCalledWith(true);

      await service.shutdown();

      expect(mockWorkers[0]?.close).toHaveBeenCalledTimes(1);
    });

    it('reports the start-up failure even when closing the failed worker fails too', async () => {
      const startFailure = new Error('connect ECONNREFUSED 127.0.0.1:6379');
      mockWaitUntilReady.mockRejectedValueOnce(startFailure);
      mockClose.mockRejectedValueOnce(new Error('Connection is closed'));

      const thrown = await service.processJobs(QUEUE_NAME, processor).catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(QueueError);
      expect(thrown).toMatchObject({ type: 'QUEUE_ERROR', data: { cause: startFailure } });
    });
  });
});
