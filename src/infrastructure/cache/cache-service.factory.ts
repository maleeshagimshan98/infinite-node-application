/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICache } from '@/application/interfaces/cache.interface';

import { RedisCacheService } from './redis/redis-cache.service';
import { redisDriverLoader } from './redis/driver/redis.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

export type CacheDriverType = 'redis' | 'memcached' | 'inmemory';

export class CacheServiceFactory implements IServiceFactory<ICache> {
  /**
   * Type guard to validate cache driver type
   */
  private isCacheDriverType(value: string): value is CacheDriverType {
    return ['redis', 'memcached', 'inmemory'].includes(value);
  }

  /**
   * Create a cache service instance using the provided Redis driver
   *
   * @returns {Promise<ICache>} Redis cache service implementation
   */
  async createRedisCacheService(): Promise<ICache> {
    return new RedisCacheService(await redisDriverLoader());
  }

  /**
   * Create a cache service instance based on configuration
   * Currently supports Redis only, but can be extended for other providers
   *
   * @returns {Promise<ICache>} Cache service implementation
   * @throws {InfrastructureError} If driver is not supported
   */
  async create(): Promise<ICache> {
    const envDriver = process.env.CACHE_DRIVER || 'redis';

    if (!this.isCacheDriverType(envDriver)) {
      throw new InfrastructureError(`Invalid cache driver: ${envDriver}`, 'DRIVER_ERROR');
    }
    const driverType: CacheDriverType = envDriver;
    switch (driverType) {
      case 'redis':
        return this.createRedisCacheService();

      case 'memcached':
        throw new InfrastructureError('Memcached cache service not yet implemented', 'DRIVER_ERROR');

      case 'inmemory':
        throw new InfrastructureError('In-memory cache service not yet implemented', 'DRIVER_ERROR');

      default:
        throw new InfrastructureError(`Unsupported cache driver: ${driverType}`, 'DRIVER_ERROR');
    }
  }
}
