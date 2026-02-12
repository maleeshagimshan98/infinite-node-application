/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICache } from '@/application/interfaces/cache.interface';

import { RedisCacheService } from './redis/redis-cache.service';
import { redisDriverLoader } from './redis/driver/redis.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

export type CacheDriverType = 'redis' | 'memcached' | 'inmemory';

export class CacheServiceFactory {
  /**
   * Type guard to validate cache driver type
   */
  private static isCacheDriverType(value: string): value is CacheDriverType {
    return ['redis', 'memcached', 'inmemory'].includes(value);
  }

  /**
   * Create a cache service instance using the provided Redis driver
   *
   * @returns {ICache} implementation
   */
  static async createRedisCacheService(): Promise<ICache> {
    return new RedisCacheService(await redisDriverLoader());
  }

  /**
   * Create a cache service instance based on configuration
   * Currently supports Redis only, but can be extended for other providers
   *
   * @returns {ICache} implementation
   * @throws {Error} if driver is not supported
   */
  static async create(): Promise<ICache> {
    const envDriver = process.env.CACHE_DRIVER || 'redis';

    if (!this.isCacheDriverType(envDriver)) {
      throw new InfrastructureError(`Invalid cache driver: ${envDriver}`);
    }
    const driverType: CacheDriverType = envDriver;
    switch (driverType) {
      case 'redis':
        return this.createRedisCacheService();

      case 'memcached':
        throw new InfrastructureError('Memcached cache service not yet implemented');

      case 'inmemory':
        throw new InfrastructureError('In-memory cache service not yet implemented');

      default:
        throw new InfrastructureError(`Unsupported cache driver: ${driverType}`);
    }
  }
}
