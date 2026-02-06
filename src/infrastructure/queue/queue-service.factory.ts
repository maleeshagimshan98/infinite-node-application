/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Queue } from 'bullmq';
import type { IQueue } from '../../application/interfaces/queue.interface';
import { BullMQQueueService } from './bullmq/bullmq-queue.service';

export class QueueServiceFactory {
  /**
   * Creates a BullMQ queue service instance
   *
   * @param {Queue} driver - The BullMQ Queue driver instance
   * @returns {IQueue} A BullMQ queue service instance
   */
  static createBullMQQueueService(driver: Queue): IQueue {
    return new BullMQQueueService(driver);
  }

  /**
   * Creates a queue service instance based on the specified type
   *
   * @param {string} queueType - The type of queue provider ('bullmq', 'sqs', 'rabbitmq', etc.)
   * @param {unknown} driver - The queue driver instance
   * @returns {IQueue} A queue service instance
   * @throws {Error} If the queue type is not supported
   *
   * @example
   * ```typescript
   * const queue = QueueServiceFactory.create('bullmq', queueDriver);
   * ```
   */
  static create(queueType: string, driver: unknown): IQueue {
    switch (queueType.toLowerCase()) {
      case 'bullmq':
      case 'bull':
        return this.createBullMQQueueService(driver as Queue);

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
