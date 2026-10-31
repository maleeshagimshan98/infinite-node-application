/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Worker } from 'bullmq';

import type { IQueue, Job, JobOptions, JobStatus } from '@/application/interfaces/infrastructure/queue.interface';

import { QueueDriver } from './driver/bullmq.driver';
import { bullmqTelemetry } from './driver/bullmq.telemetry';
import { QueueError } from '../errors/queue.error';

import type { Queue, Job as BullMQJob } from 'bullmq';

/**
 * BullMQ Queue Service Implementation
 *
 * Provides queue functionality using BullMQ with Redis as the backing store.
 * Supports job creation, processing, and status tracking.
 *
 * @class BullMQQueueService
 * @implements {IQueue}
 *
 * @example
 * ```typescript
 * const queueDriver = queueService.service(); // BullMQ Queue instance
 * const queueService = new BullMQQueueService(queueDriver);
 *
 * // Add a job to the queue
 * const jobId = await queueService.addJob({ email: 'user@example.com', action: 'send-welcome-email' });
 *
 * // Process jobs from the queue
 * await queueService.processJobs(async (job) => {
 *   console.log('Processing job:', job.id, job.data);
 *   // Perform job logic
 * });
 *
 * // Check job status
 * const status = await queueService.getJobStatus(jobId);
 * ```
 */
export class BullMQQueueService implements IQueue {
  /**
   * The QueueDriver instance
   *
   *  @type {QueueDriver}
   */
  private driver: QueueDriver;

  /**
   * Map to store multiple queue instances by name (if needed)
   *
   * @private
   * @type {Map<string, Queue>}
   */
  private queues: Map<string, Queue> = new Map();

  /**
   * Map to store Worker instances for processing jobs
   *
   * @private
   * @type {Map<string, Worker[]>}
   */
  private workers: Map<string, Worker[]> = new Map();

  /**
   * Creates an instance of BullMQQueueService
   *
   * @param {QueueDriver} driver - The BullMQ Queue instance from the core driver
   */
  constructor(driver: QueueDriver) {
    this.driver = driver;
    const client = driver.client();
    if (!client) {
      throw new QueueError('Invalid BullMQ client provided to BullMQQueueService');
    }
    this.queues.set('default', client);
  }

  /**
   * Get the service name for this queue implementation
   *
   * @returns {'queue'} The service name identifier
   */
  serviceName(): 'queue' {
    return 'queue';
  }

  /**
   * Indicates that this queue service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this queue service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  /**
   * Returns the underlying BullMQ Queue driver instance
   */
  getDriver(): QueueDriver {
    return this.driver;
  }

  /**
   * Checks if a queue with the given name exists
   *
   * @param {string} queueName - The name of the queue to check
   * @returns {boolean} True if the queue exists, false otherwise
   */
  hasQueue(queueName: string): boolean {
    return this.queues.has(queueName);
  }

  /**
   * Create a new queue instance for a specific queue name
   *
   * @param {string} queueName - The name of the queue to create
   * @returns {IQueue} The queue service instance (for chaining)
   * @throws {QueueError} If a queue with the given name already exists
   */
  newQueue(queueName: string): IQueue {
    if (this.queues.has(queueName)) {
      throw new QueueError(`Queue with name "${queueName}" already exists`);
    }
    const queue = QueueDriver.newQueue(queueName, this.driver.config());
    this.queues.set(queueName, queue);
    return this;
  }

  /**
   * Adds a new job to the queue
   *
   * @template T - The type of job data
   * @param {string} queueName - The name of the queue to add the job to
   * @param {T} data - The job data payload
   * @param {JobOptions} options - Optional job configuration (delay, priority, attempts, etc.)
   * @returns {Promise<string>} The unique job ID
   * @throws {QueueError} If the queue doesn't exist or the job cannot be added
   *
   * @example
   * ```typescript
   * const jobId = await queueService.addJob(
   *   { userId: '123', task: 'generate-report' },
   *   { delay: 5000, priority: 10, attempts: 3 }
   * );
   * ```
   */
  async addJob<T>(queueName: string, data: T, options?: JobOptions): Promise<Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new QueueError(`Queue not found: ${queueName}`);
    }

    try {
      const job = await queue.add(queueName, data, options);
      const queueJob: Job<T> = {
        id: job.id,
        data,
        opts: options || {},
        attemptsMade: 0,
        timestamp: Date.now(),
      };

      return queueJob;
    } catch (e: unknown) {
      throw new QueueError(
        `Failed to add job to queue "${queueName}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        { cause: e },
      );
    }
  }

  /**
   * Retry all failed jobs on the given queue.
   *
   * Creates a temporary Queue instance if the queue is not already registered
   * (e.g. external queues owned by another service).
   *
   * @param {string} queueName - The name of the queue
   * @returns {Promise<void>}
   * @throws {QueueError} If the failed jobs cannot be retried
   */
  async retryJobs(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName) ?? QueueDriver.newQueue(queueName, this.driver.config());
    try {
      await queue.retryJobs({ state: 'failed' });
      // Close the temporary queue instance if it wasn't already tracked
      if (!this.queues.has(queueName)) {
        await queue.close();
      }
    } catch (e: unknown) {
      throw new QueueError(
        `Failed to retry jobs on queue "${queueName}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        { cause: e },
      );
    }
  }

  /**
   * Processes jobs from the queue by creating a BullMQ Worker.
   *
   * @template T - The type of job data
   * @param {string} queueName - The name of the queue to process
   * @param {(job: Job<T>) => Promise<void>} processor - The job processing function
   * @returns {Promise<void>}
   * @throws {QueueError} If the Worker cannot be created or fails to become ready
   */
  async processJobs<T>(queueName: string, processor: (job: Job<T>) => Promise<void>): Promise<void> {
    const driverConfig = this.driver.config();

    try {
      const worker = new Worker<T>(
        queueName,
        async (job: BullMQJob<T>) => {
          const queueJob: Job<T> = {
            id: job.id,
            data: job.data,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp,
          };
          await processor(queueJob);
        },
        {
          connection: {
            host: driverConfig.params.host,
            port: driverConfig.params.port,
            username: driverConfig.params.username,
            password: driverConfig.params.password,
          },
          telemetry: bullmqTelemetry,
        },
      );

      // BullMQ requires an 'error' listener — without one, an unhandled 'error' event crashes the
      // process. This is a long-lived event stream, not a single call with a caller to propagate to,
      // so it stays a logged sink rather than a throw.
      worker.on('error', (err) => {
        console.error(`Worker error on queue "${queueName}":`, err);
      });

      worker.on('active', (job) => {
        console.log(`BullMQ: picked up job ${job.id} on queue "${queueName}"`);
      });

      worker.on('failed', (job, err) => {
        console.error(`BullMQ: job ${job?.id} failed on queue "${queueName}":`, err.message);
      });

      await worker.waitUntilReady();
      console.log(`  BullMQ Worker ready — listening on queue "${queueName}"`);

      // Store the worker instance for later shutdown
      if (!this.workers.has(queueName)) {
        this.workers.set(queueName, []);
      }
      this.workers.get(queueName)?.push(worker);
    } catch (e: unknown) {
      throw new QueueError(
        `Failed to start worker for queue "${queueName}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        { cause: e },
      );
    }
  }

  /**
   * Closes the workers processing a queue, waiting for their in-flight jobs to finish
   *
   * The workers are forgotten afterwards, so `shutdown()` does not close them again.
   *
   * @param {string} queueName - The name of the queue whose workers to close
   * @returns {Promise<void>}
   * @throws {QueueError} If a worker fails to close
   */
  async closeWorkers(queueName: string): Promise<void> {
    const workers = this.workers.get(queueName) ?? [];
    this.workers.delete(queueName);
    try {
      for (const worker of workers) {
        await worker.close();
      }
    } catch (e: unknown) {
      throw new QueueError(
        `Failed to close workers for queue "${queueName}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        { cause: e },
      );
    }
  }

  /**
   * Gets the current status of a job
   *
   * @param {string} jobId - The unique job identifier
   * @returns {Promise<JobStatus>} The job status (completed, failed, pending, etc.)
   * @throws {QueueError} If the default queue doesn't exist or the job status cannot be retrieved
   *
   * @example
   * ```typescript
   * const status = await queueService.getJobStatus('job-123');
   *
   * if (status === 'completed') {
   *   console.log('Job finished successfully');
   * } else if (status === 'failed') {
   *   console.log('Job failed');
   * }
   * ```
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const queue = this.queues.get('default');
    if (!queue) {
      throw new QueueError('Default queue not found');
    }

    try {
      const job = await queue.getJob(jobId);

      if (!job) {
        return 'unknown';
      }

      const state = await job.getState();

      // Map BullMQ JobState to application JobStatus
      switch (state) {
        case 'completed':
          return 'completed';
        case 'failed':
          return 'failed';
        case 'waiting':
        case 'waiting-children':
        case 'delayed':
        case 'prioritized':
          return 'pending';
        case 'active':
          return 'pending'; // Active jobs are considered pending from application perspective
        case 'unknown':
        default:
          return 'unknown';
      }
    } catch (e: unknown) {
      throw new QueueError(
        `Failed to get status for job "${jobId}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        { cause: e },
      );
    }
  }

  /**
   * Gracefully shutdown the BullMQ queue and workers
   *
   * @returns {Promise<void>}
   * @throws {QueueError} If a queue or worker fails to close
   */
  async shutdown(): Promise<void> {
    try {
      for (const queue of this.queues.values()) {
        await queue.close();
      }
      console.log('  BullMQ queues closed');

      for (const workers of this.workers.values()) {
        for (const worker of workers) {
          await worker.close();
        }
      }
      console.log('  BullMQ workers closed');
    } catch (e: unknown) {
      throw new QueueError(
        `Failed to shut down BullMQ queue service: ${e instanceof Error ? e.message : 'Unknown error'}`,
        { cause: e },
      );
    }
  }
}
