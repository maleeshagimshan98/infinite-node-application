/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IEmailJobData, IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { IQueue } from '@/application/interfaces/infrastructure/queue.interface';
import type { IWorker } from '@/application/interfaces/worker/worker.interface';

/**
 * Sends the emails queued through `IEmailService.enqueueEmail()`.
 *
 * Each job is handed to `IEmailService.deliverQueuedEmail()`, which logs the email, sends it and records the result.
 * A job that throws is retried by the queue with the attempts and backoff it was queued with.
 *
 * @class EmailWorker
 * @implements {IWorker}
 */
export class EmailWorker implements IWorker {
  constructor(
    private readonly queue: IQueue,
    private readonly emailService: IEmailService,
  ) {}

  /**
   * Human-readable identifier for this worker
   *
   * @returns {string} The worker name
   */
  workerName(): string {
    return 'email';
  }

  /**
   * Start consuming the email queue
   *
   * @returns {Promise<void>} resolving once the queue processor is ready
   * @throws {QueueError} QUEUE_ERROR when the queue processor cannot be started
   */
  async init(): Promise<void> {
    await this.queue.processJobs<IEmailJobData>(this.emailService.emailQueueName(), (job) =>
      this.emailService.deliverQueuedEmail(job),
    );
  }

  /**
   * Stop consuming the email queue, waiting for the emails being sent to finish
   *
   * @returns {Promise<void>} resolving once the queue processor is closed
   * @throws {QueueError} QUEUE_ERROR when the queue processor fails to close
   */
  async shutdown(): Promise<void> {
    await this.queue.closeWorkers(this.emailService.emailQueueName());
  }
}

export default EmailWorker;
