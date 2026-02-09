/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { RedisDriver } from './redis.driver';
import { registerService } from '../../service.container';
import type { IRedisConfig } from '../../../config/drivers/redis.config';
import type { AwilixContainer } from 'awilix';

export const redisDriverLoader = async (container: AwilixContainer, config: IRedisConfig): Promise<RedisDriver> => {
  try {
    const redisDriver: RedisDriver = new RedisDriver();
    await redisDriver.init(container, config);
    const client: RedisClientType | undefined = redisDriver.driver();
    if (!client || !(client instanceof Object)) {
      throw new InfiniteNodeError('Redis client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return redisDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load RedisDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
