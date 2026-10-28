/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IQueue } from '@/application/interfaces/infrastructure/queue.interface';

import { BullMQQueueService } from './bullmq/bullmq-queue.service';
import { bullmqDriverLoader } from './bullmq/driver/bullmq.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

export class QueueServiceFactory implements IServiceFactory<IQueue> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'queue'} Service registration name
   */
  name(): 'queue' {
    return 'queue';
  }

  /**
   * Creates a BullMQ queue service instance
   *
   * @returns {Promise<IQueue>} A BullMQ queue service instance
   */
  async createBullMQQueueService(): Promise<IQueue> {
    return new BullMQQueueService(await bullmqDriverLoader());
  }

  /**
   * Creates a queue service instance based on the configured queue driver type
   *
   * @returns {Promise<IQueue>} A queue service instance
   * @throws {InfrastructureError} If the queue type is not supported
   *
   * @example
   * ```typescript
   * const factory = new QueueServiceFactory();
   * const queue = await factory.create();
   * ```
   */
  async create(): Promise<IQueue> {
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
        throw new InfrastructureError(`Unsupported queue type: ${queueType}`, 'DRIVER_ERROR', {
          queueType,
        });
    }
  }
}
