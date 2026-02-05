/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../core.service';
import type { IQueueConfig } from '../../config/service/queue.config';
import { Queue } from 'bullmq';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';

export class QueueService implements ICoreService<Queue, IQueueConfig> {
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
        `Failed to initialize QueueService: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  service(): Queue | undefined {
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
