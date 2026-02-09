/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import type { ICoreDriver } from '../../core.driver';
import type { IRedisConfig } from '../../../config/drivers/redis.config';
import type { AwilixContainer } from 'awilix';

export class RedisDriver implements ICoreDriver<RedisClientType, IRedisConfig> {
  private client: RedisClientType | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: IRedisConfig): Promise<void> {
    this.client = createClient(config.params);
    //... TODO - check error types and see what can you do to handle them properly
    this.client.on('error', (err: Error) => console.log('Redis Client Error', err));
    await this.client.connect();
  }

  driver(): RedisClientType | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}
