/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import type { ICache } from '../../application/interfaces/cache.interface';
import { RedisCacheService } from './redis/redis-cache.service';

export type CacheDriverType = 'redis' | 'memcached' | 'inmemory';

export class CacheServiceFactory {
  /**
   * Create a cache service instance using the provided Redis driver
   *
   * @param {RedisClientType} redisClient - Redis client instance from the driver layer
   * @returns {ICache} implementation
   */
  static createRedisCacheService(redisClient: RedisClientType): ICache {
    return new RedisCacheService(redisClient);
  }

  /**
   * Create a cache service instance based on configuration
   * Currently supports Redis only, but can be extended for other providers
   *
   * @param {CacheDriverType} driver - Cache driver type ('redis', 'memcached', 'inmemory', etc.)
   * @param {unknown} client - Client instance from the driver layer
   * @returns {ICache} implementation
   * @throws {Error} if driver is not supported
   */
  static create(driver: CacheDriverType, client: unknown): ICache {
    switch (driver) {
      case 'redis':
        return new RedisCacheService(client as RedisClientType);

      case 'memcached':
        throw new Error('Memcached cache service not yet implemented');

      case 'inmemory':
        throw new Error('In-memory cache service not yet implemented');

      default:
        throw new Error(`Unsupported cache driver: ${driver}`);
    }
  }
}
