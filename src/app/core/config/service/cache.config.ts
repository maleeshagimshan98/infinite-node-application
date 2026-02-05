/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';
import type { IRedisConfig } from './redis.config';
import { redisConfig } from './redis.config';

export interface ICacheConfig extends IServiceConfig {
  driver: 'redis' | 'memcached' | 'inmemory';
  params: {
    redis: IRedisConfig;
  };
}

export const cacheConfig = (): ICacheConfig => {
  return {
    serviceName: 'cache',
    singleton: true,
    deferred: false,
    optional: process.env.CACHE_SERVICE_OPTIONAL === 'true',
    driver: (process.env.CACHE_DRIVER as 'redis' | 'memcached' | 'inmemory') || 'redis',
    params: {
      redis: redisConfig(),
    },
  };
};
