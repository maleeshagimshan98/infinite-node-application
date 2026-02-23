/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Queue } from 'bullmq';

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import type { IQueueConfig } from './queue.config';

export class QueueDriver implements ICoreDriver<Queue, IQueueConfig> {
  /**
   * The configuration for the QueueDriver
   *
   * @type {IQueueConfig}
   */
  private _config: IQueueConfig;

  /**
   * The underlying BullMQ Queue client instance
   *
   * @type {Queue | undefined}
   */
  private _client: Queue | undefined;

  constructor(config: IQueueConfig) {
    this._config = config;
  }

  async init(): Promise<void> {
    try {
      const queue = new Queue(this._config.queueName, {
        connection: {
          host: this._config.params.host,
          port: this._config.params.port,
          username: this._config.params.username,
          password: this._config.params.password,
        },
      });

      //... TODO - check the queue is connected properly

      this._client = queue;
    } catch (err: unknown) {
      throw new DriverError(
        `Failed to initialize QueueDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  client(): Queue | undefined {
    return this._client;
  }

  config(): IQueueConfig {
    return this._config;
  }

  async shutdown(): Promise<void> {
    if (!this._client) return;
    try {
      await this._client.close();
    } catch {
      //... TODO
    } finally {
      this._client = undefined;
    }
  }
}
