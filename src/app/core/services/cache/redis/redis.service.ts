/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import type { ICoreService } from '../../core.service';
import type { IRedisConfig } from '../../../config/service/redis.config';
import type { AwilixContainer } from 'awilix';

export class RedisService implements ICoreService<RedisClientType, IRedisConfig> {
  private client: RedisClientType | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: IRedisConfig): Promise<void> {
    this.client = createClient(config.params);
    //... TODO - check error types and see what can you do to handle them properly
    this.client.on('error', (err: Error) => console.log('Redis Client Error', err));
    await this.client.connect();
  }

  service(): RedisClientType | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}
