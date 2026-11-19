/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * Job options for queue operations
 */
export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number | { type: string; delay: number };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  [key: string]: unknown;
}

/**
 * Job interface representing a queue job
 *
 * @template T - Type of the job data payload
 */
export interface Job<T> {
  id: string | number | undefined;
  data: T;
  opts?: JobOptions;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  timestamp: number;
}

export type JobStatus = 'completed' | 'failed' | 'pending' | 'unknown';

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface IQueue extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'queue'} Always `queue`.
   */
  serviceName(): 'queue';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;

  /**
   * Checks if a queue with the given name exists
   *
   * @param {string} queueName - The name of the queue to check
   * @returns {boolean} True if the queue exists, false otherwise
   */
  hasQueue(queueName: string): boolean;

  /**
   * Create a new queue instance with the given name
   *
   * @param {string} queueName - Name of the queue to create
   * @returns {IQueue} Queue instance for the specified name
   * @throws {InfrastructureError} QUEUE_ERROR when a queue with the given name already exists.
   */
  newQueue(queueName: string): IQueue;

  /**
   * Add a job to a queue
   *
   * @param {string} queueName - Name of the queue
   * @param {T} jobData - Job data/payload
   * @param {JobOptions} options - Optional job configuration
   * @returns {Promise<Job<T>>} resolving to the job instance
   * @throws {InfrastructureError} QUEUE_ERROR when the queue doesn't exist or the job cannot be added.
   */
  addJob<T>(queueName: string, jobData: T, options?: JobOptions): Promise<Job<T>>;

  /**
   * Register a processor function for a queue
   *
   * Each call starts a new worker with its own connection, which the queue service keeps until it is closed.
   * Close it with `closeWorkers()` once the queue no longer needs processing.
   *
   * @param {string} queueName - Name of the queue to process
   * @param {(job: Job<T>) => Promise<void>} processor - Function to process each job
   * @returns {Promise<void>}
   * @throws {QueueError} QUEUE_ERROR when the worker cannot be started; nothing is left to close
   */
  processJobs<T>(queueName: string, processor: (job: Job<T>) => Promise<void>): Promise<void>;

  /**
   * Stop processing a queue: close its workers, waiting for the jobs they are running to finish
   *
   * Call it once the queue no longer needs processing — in `IWorker.shutdown()` for every queue `init()` processes,
   * and right after the work is done wherever a processor runs for a limited time. An open worker keeps polling,
   * keeps taking jobs and keeps its connection and memory. It closes **every** worker on the queue, so never call it
   * for a queue another component still processes.
   *
   * @param {string} queueName - Name of the queue whose workers to close
   * @returns {Promise<void>}
   * @throws {QueueError} QUEUE_ERROR when a worker fails to close, once every other worker on the queue is closed
   */
  closeWorkers(queueName: string): Promise<void>;

  /**
   * Retry all failed jobs on a queue
   *
   * @param {string} queueName - Name of the queue
   * @returns {Promise<void>}
   * @throws {InfrastructureError} QUEUE_ERROR when the queue doesn't exist or its failed jobs cannot be retried.
   */
  retryJobs(queueName: string): Promise<void>;

  /**
   * Get the status of a job by ID
   *
   * @param {string} jobId - Job identifier
   * @returns {Promise<JobStatus>} Promise resolving to job status
   * @throws {InfrastructureError} QUEUE_ERROR when the queue doesn't exist or the job's status cannot be read.
   */
  getJobStatus(jobId: string): Promise<JobStatus>;
}
