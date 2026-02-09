/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICacheConfig } from '../../config/drivers/cache.config';
import type { ICoreDriver } from '../core.driver';
import { RedisDriver } from './redis/redis.driver';
import type { RedisClientType } from 'redis';

export type CacheClientType = RedisClientType;

export class CacheDriver implements ICoreDriver<CacheClientType, ICacheConfig> {
  private cacheClient: CacheClientType | undefined;
  private driverClass: RedisDriver | undefined;

  async init(container: AwilixContainer, config: ICacheConfig): Promise<void> {
    if (config.driver === 'redis') {
      const driver = new RedisDriver();
      await driver.init(container, config.params.redis);
      this.cacheClient = driver.driver();
      this.driverClass = driver;
    } else {
      throw new Error(`Cache driver ${config.driver} is not supported yet.`);
    }
  }

  driver(): CacheClientType | undefined {
    return this.cacheClient;
  }

  async shutdown(): Promise<void> {
    if (this.driverClass) {
      await this.driverClass.shutdown();
    }
  }
}
