/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICacheConfig } from '../../config/service/cache.config';
import { CacheService } from './cache.service';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../service.container';

export const cacheServiceLoader = async (container: AwilixContainer, config: ICacheConfig): Promise<CacheService> => {
  try {
    const cacheService = new CacheService();
    await cacheService.init(container, config);
    const client = cacheService.service();
    if (!client && !config.optional) {
      throw new InfiniteNodeError('Cache client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return cacheService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load CacheService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
