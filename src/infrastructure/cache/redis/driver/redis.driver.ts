/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { createClient } from 'redis';

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import type { RedisClientType } from 'redis';
import type { IRedisConfig } from './redis.config';

export class RedisDriver implements ICoreDriver<RedisClientType, IRedisConfig> {
  /**
   * Redis client instance from the driver layer
   *
   * @type {IRedisConfig}
   */
  private _config: IRedisConfig;

  constructor(config: IRedisConfig) {
    this._config = config;
  }

  /**
   * Redis client instance from the driver layer
   *
   * @type {RedisClientType | undefined}
   */
  private _client: RedisClientType | undefined;

  async init(): Promise<void> {
    this._client = createClient(this._config.params);
    //... TODO - check error types and see what can you do to handle them properly
    this._client.on('error', (err: Error) => {
      throw new InfrastructureError(`Redis client error: ${err.message}`);
    });
    await this._client.connect();
  }

  public config(): IRedisConfig {
    return this._config;
  }

  client(): RedisClientType | undefined {
    return this._client;
  }

  async shutdown(): Promise<void> {
    if (this._client) {
      await this._client.quit();
    }
  }
}
