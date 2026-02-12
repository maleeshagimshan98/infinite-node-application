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
 */
export interface Job<T> {
  id: string | number;
  data: T;
  opts: JobOptions;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  timestamp: number;
}

export type JobStatus = 'completed' | 'failed' | 'pending' | 'unknown';

import type { IBaseInfrastructureService } from './base.interface';

export interface IQueue extends IBaseInfrastructureService {
  serviceName(): 'queue';
  singleton(): true;
  deferred(): false;
  /**
   * Add a job to a queue
   *
   * @param {string} queueName - Name of the queue
   * @param {T} jobData - Job data/payload
   * @param {JobOptions} options - Optional job configuration
   * @returns {Promise<string>} resolving to the job ID
   */
  addJob<T>(queueName: string, jobData: T, options?: JobOptions): Promise<string>;

  /**
   * Register a processor function for a queue
   *
   * @param {string} queueName - Name of the queue to process
   * @param {(job: Job<T>) => Promise<void>} processor - Function to process each job
   * @returns {void}
   */
  processJobs<T>(queueName: string, processor: (job: Job<T>) => Promise<void>): void;

  /**
   * Get the status of a job by ID
   *
   * @param {string} jobId - Job identifier
   * @returns {Promise<JobStatus>} Promise resolving to job status
   */
  getJobStatus(jobId: string): Promise<JobStatus>;
}
