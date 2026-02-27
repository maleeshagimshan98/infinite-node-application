/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IQueue, Job, JobOptions, JobStatus } from '@/application/interfaces/queue.interface';
import { PersistanceError } from '@/infrastructure/persistance/database/erros/persistance.error';

import type { QueueDriver } from './driver/bullmq.driver';
import type { Queue } from 'bullmq';

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
   * The BullMQ Queue client instance
   * @private
   * @type {Queue}
   */
  private client: Queue;

  /**
   * Creates an instance of BullMQQueueService
   *
   * @param {QueueDriver} driver - The BullMQ Queue instance from the core driver
   */
  constructor(driver: QueueDriver) {
    this.driver = driver;
    const client = driver.client();
    if (!client || !(client instanceof Object)) {
      throw new PersistanceError('Invalid BullMQ client provided to BullMQQueueService');
    }
    this.client = client;
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
   * Adds a new job to the queue
   *
   * @template T - The type of job data
   * @param {string} queueName - The name of the queue to add the job to
   * @param {T} data - The job data payload
   * @param {JobOptions} options - Optional job configuration (delay, priority, attempts, etc.)
   * @returns {Promise<string>} The unique job ID
   *
   * @example
   * ```typescript
   * const jobId = await queueService.addJob(
   *   { userId: '123', task: 'generate-report' },
   *   { delay: 5000, priority: 10, attempts: 3 }
   * );
   * ```
   */
  async addJob<T>(queueName: string, data: T, options?: JobOptions): Promise<string> {
    const job = await this.client.add(queueName, data, options);

    return job?.id ?? '';
  }

  /**
   * Processes jobs from the queue
   *
   * Note: BullMQ processes jobs using a Worker, not the Queue itself.
   * This method is a placeholder. In production, you should create a Worker instance
   * in the core driver and use it to process jobs.
   *
   * @template T - The type of job data
   * @param {string} queueName - The name of the queue to process
   * @param {(job: Job<T>) => Promise<void>} processor - The job processing function
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await queueService.processJobs(async (job) => {
   *   console.log(`Processing job ${job.id}:`, job.data);
   *   // Perform async work
   *   await sendEmail(job.data.email);
   * });
   * ```
   */
  async processJobs<T>(queueName: string, processor: (job: Job<T>) => Promise<void>): Promise<void> {
    // TODO: BullMQ requires a Worker instance for processing jobs
    // The Queue instance is only for adding jobs
    // This is a placeholder implementation
    console.log('[BullMQ Queue] Job processing should be handled by a Worker instance');

    // Example of what should be done in the core driver:
    // const worker = new Worker(queueName, async (job) => {
    //   await processor({ id: job.id, data: job.data as T });
    // }, { connection: redisConnection });
  }

  /**
   * Gets the current status of a job
   *
   * @param {string} jobId - The unique job identifier
   * @returns {Promise<JobStatus>} The job status (completed, failed, pending, etc.)
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
    const job = await this.client.getJob(jobId);

    if (!job) {
      return 'unknown';
    }

    const state = await job.getState();
    return state;
  }

  /**
   * Gracefully shutdown the BullMQ queue and workers
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('  BullMQ queue closed');
    }
  }
}
