/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Queue } from 'bullmq';

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import { bullmqTelemetry } from './bullmq.telemetry';

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
  private _default_client: Queue | undefined;

  constructor(config: IQueueConfig) {
    this._config = config;
  }

  /**
   * Create the default BullMQ queue and wait until its Redis connection is ready.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} If the queue cannot be created or connected
   */
  async init(): Promise<void> {
    try {
      const queue = new Queue(this._config.queueName, {
        connection: {
          host: this._config.params.host,
          port: this._config.params.port,
          username: this._config.params.username,
          password: this._config.params.password,
        },
        telemetry: bullmqTelemetry,
      });

      await queue.waitUntilReady();

      this._default_client = queue;
    } catch (err: unknown) {
      throw new DriverError(
        `Failed to initialize QueueDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Create a new BullMQ Queue instance based on the provided queue name and configuration
   *
   * @param {string} queueName - The name of the queue to create
   * @param {IQueueConfig} config - The configuration for the queue connection
   * @returns {Queue} A new instance of BullMQ Queue configured for the specified queue
   */
  static newQueue(queueName: string, config: IQueueConfig): Queue {
    const queue = new Queue(queueName, {
      connection: {
        host: config.params.host,
        port: config.params.port,
        username: config.params.username,
        password: config.params.password,
      },
      telemetry: bullmqTelemetry,
    });
    return queue;
  }

  client(): Queue | undefined {
    return this._default_client;
  }

  config(): IQueueConfig {
    return this._config;
  }

  /**
   * Close the default BullMQ queue.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} If the queue fails to close
   */
  async shutdown(): Promise<void> {
    if (!this._default_client) return;
    try {
      await this._default_client.close();
    } catch (e: unknown) {
      throw new DriverError(
        `Failed to shutdown QueueDriver: ${e instanceof Error ? e.message : 'Unknown error'}`,
        e instanceof Error ? e : undefined,
      );
    } finally {
      this._default_client = undefined;
    }
  }
}
