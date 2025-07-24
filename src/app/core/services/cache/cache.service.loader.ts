/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { createClient } from 'redis';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { ICacheConfig } from '../../config/service/cache.config';
import { asFunction, type AwilixContainer } from 'awilix';

export const cacheServiceLoader = (container: AwilixContainer, config: ICacheConfig): void => {
  try {
    if (config.driver === 'redis') {
      const client = createClient(config.redis);
      //... add logging and error handling
      client.on('error', (err) => console.log('Redis Client Error', err));
      container.register({
        cacheClient: asFunction(() => client).singleton(),
      });
    } else {
      throw new InfiniteNodeError(`Cache driver "${config.driver}" is not supported.`);
    }
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load CacheService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
