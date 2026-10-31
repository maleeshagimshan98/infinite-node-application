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
  serviceName(): 'queue';
  singleton(): true;
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
   */
  newQueue(queueName: string): IQueue;

  /**
   * Add a job to a queue
   *
   * @param {string} queueName - Name of the queue
   * @param {T} jobData - Job data/payload
   * @param {JobOptions} options - Optional job configuration
   * @returns {Promise<Job<T>>} resolving to the job instance
   */
  addJob<T>(queueName: string, jobData: T, options?: JobOptions): Promise<Job<T>>;

  /**
   * Register a processor function for a queue
   *
   * @param {string} queueName - Name of the queue to process
   * @param {(job: Job<T>) => Promise<void>} processor - Function to process each job
   * @returns {Promise<void>}
   */
  processJobs<T>(queueName: string, processor: (job: Job<T>) => Promise<void>): Promise<void>;

  /**
   * Stop processing a queue: close its workers, waiting for the jobs they are running to finish
   *
   * @param {string} queueName - Name of the queue whose workers to close
   * @returns {Promise<void>}
   */
  closeWorkers(queueName: string): Promise<void>;

  /**
   * Retry all failed jobs on a queue
   *
   * @param {string} queueName - Name of the queue
   * @returns {Promise<void>}
   */
  retryJobs(queueName: string): Promise<void>;

  /**
   * Get the status of a job by ID
   *
   * @param {string} jobId - Job identifier
   * @returns {Promise<JobStatus>} Promise resolving to job status
   */
  getJobStatus(jobId: string): Promise<JobStatus>;
}
