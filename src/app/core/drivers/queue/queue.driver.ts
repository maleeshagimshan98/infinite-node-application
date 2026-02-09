/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICoreDriver } from '../core.driver';
import type { IQueueConfig } from '../../config/drivers/queue.config';
import { Queue } from 'bullmq';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';

export class QueueDriver implements ICoreDriver<Queue, IQueueConfig> {
  private client: Queue | undefined;

  constructor() {}

  async init(_container: AwilixContainer, config: IQueueConfig): Promise<void> {
    try {
      const queue = new Queue(config.queueName, {
        connection: {
          host: config.params.host,
          port: config.params.port,
          username: config.params.username,
          password: config.params.password,
        },
      });

      //... TODO - check the queue is connected properly

      this.client = queue;
    } catch (err: unknown) {
      throw new InfiniteNodeError(
        `Failed to initialize QueueDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  driver(): Queue | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.close();
    } catch {
      //... TODO
    } finally {
      this.client = undefined;
    }
  }
}
