/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { createClient } from 'redis';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { ICacheConfig } from '../../config/service/cache.config';
import { type AwilixContainer } from 'awilix';
import { registerService } from '../service.container';

export const cacheServiceLoader = async (
  name: string,
  container: AwilixContainer,
  config: ICacheConfig,
): Promise<void> => {
  try {
    if (config.driver === 'redis') {
      const client = createClient();
      client
        .on('error', (err) => console.log('Redis Client Error', err))
        .connect()
        .then(() => {
          registerService(name, container, config, client);
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
