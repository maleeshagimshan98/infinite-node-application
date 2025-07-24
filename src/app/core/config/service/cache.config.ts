/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface ICacheConfig extends IServiceConfig {
  driver: string;
  redis: {
    uri: string;
    ttl: string;
    connectionTimeout: string;
  };
}

export const cacheConfig = (): ICacheConfig => {
  return {
    driver: process.env.CACHE_DRIVER || 'redis',
    deffered: true,
    redis: {
      uri: process.env.CACHE_SERVER_URI || 'redis://localhost:6379',
      ttl: process.env.CACHE_TTL || '3600',
      connectionTimeout: process.env.CONNECTION_TIMEOUT || '5000',
    },
  };
};
