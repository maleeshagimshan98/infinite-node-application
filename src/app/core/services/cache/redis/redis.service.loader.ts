/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import { InfiniteNodeError } from '../../../../errors/InfiniteNodeError';
import { RedisService } from './redis.service';
import { registerService } from '../../service.container';
import type { IRedisConfig } from '../../../config/service/redis.config';
import type { AwilixContainer } from 'awilix';

export const redisServiceLoader = async (container: AwilixContainer, config: IRedisConfig): Promise<RedisService> => {
  try {
    const redisService: RedisService = new RedisService();
    await redisService.init(container, config);
    const client: RedisClientType | undefined = redisService.service();
    if (!client || !(client instanceof Object)) {
      throw new InfiniteNodeError('Redis client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return redisService;
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load RedisService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
