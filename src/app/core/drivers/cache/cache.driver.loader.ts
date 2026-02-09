/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICacheConfig } from '../../config/drivers/cache.config';
import { CacheDriver } from './cache.service';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import { registerService } from '../../service.container';

export const cacheDriverLoader = async (container: AwilixContainer, config: ICacheConfig): Promise<CacheDriver> => {
  try {
    const cacheDriver = new CacheDriver();
    await cacheDriver.init(container, config);
    const client = cacheDriver.driver();
    if (!client && !config.optional) {
      throw new InfiniteNodeError('Cache client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return cacheDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load CacheDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
