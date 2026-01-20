/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICacheConfig } from '../../config/service/cache.config';
import type { ICoreService } from '../core.service';
import { RedisService } from './redis/redis.service';
import type { RedisClientType } from 'redis';

export type CacheClientType = RedisClientType;

export class CacheService implements ICoreService<CacheClientType, ICacheConfig> {
  private cacheClient: CacheClientType | undefined;
  private serviceClass: RedisService | undefined;

  async init(container: AwilixContainer, config: ICacheConfig): Promise<void> {
    if (config.driver === 'redis') {
      const service = new RedisService();
      await service.init(container, config.params.redis);
      this.cacheClient = service.service();
      this.serviceClass = service;
    } else {
      throw new Error(`Cache driver ${config.driver} is not supported yet.`);
    }
  }

  service(): CacheClientType | undefined {
    return this.cacheClient;
  }

  async shutdown(): Promise<void> {
    if (this.serviceClass) {
      await this.serviceClass.shutdown();
    }
  }
}
