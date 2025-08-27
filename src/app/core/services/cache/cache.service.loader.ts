/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { ICacheConfig } from '../../config/service/cache.config';
import { type AwilixContainer } from 'awilix';
import { registerService } from '../service.container';

export const createRedisClient = async (container: AwilixContainer, config: ICacheConfig): Promise<RedisClientType> => {
  const client: RedisClientType = createClient(config.redis);
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();
  return client;
};

export const cacheServiceLoader = async (
  name: string,
  container: AwilixContainer,
  config: ICacheConfig,
): Promise<void> => {
  try {
    if (config.driver === 'redis') {
      const client = await createRedisClient(container, config);
      registerService(name, container, config, client);
    } else {
      throw new InfiniteNodeError(`Cache driver "${config.driver}" is not supported.`);
    }
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load CacheService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
