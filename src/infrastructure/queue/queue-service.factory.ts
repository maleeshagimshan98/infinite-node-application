/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IQueue } from '@/application/interfaces/queue.interface';

import { BullMQQueueService } from './bullmq/bullmq-queue.service';
import { bullmqDriverLoader } from './bullmq/driver/bullmq.driver.loader';

export class QueueServiceFactory {
  /**
   * Creates a BullMQ queue service instance
   *
   * @returns {IQueue} A BullMQ queue service instance
   */
  static async createBullMQQueueService(): Promise<IQueue> {
    return new BullMQQueueService(await bullmqDriverLoader());
  }

  /**
   * Creates a queue service instance based on the specified type
   *
   * @param {string} queueType - The type of queue provider ('bullmq', 'sqs', 'rabbitmq', etc.)
   * @returns {IQueue} A queue service instance
   * @throws {Error} If the queue type is not supported
   *
   * @example
   * ```typescript
   * const queue = QueueServiceFactory.create('bullmq', queueDriver);
   * ```
   */
  static async create(): Promise<IQueue> {
    const queueType = process.env.QUEUE_DRIVER || 'bullmq';
    switch (queueType.toLowerCase()) {
      case 'bullmq':
      case 'bull':
        return this.createBullMQQueueService();

      // Future provider support:
      // case 'sqs':
      //   return this.createSQSQueueService(driver as SQSClient);
      //
      // case 'rabbitmq':
      // case 'amqp':
      //   return this.createRabbitMQQueueService(driver as AmqpConnection);
      //
      // case 'kafka':
      //   return this.createKafkaQueueService(driver as KafkaClient);

      default:
        throw new Error(`Unsupported queue type: ${queueType}`);
    }
  }
}
