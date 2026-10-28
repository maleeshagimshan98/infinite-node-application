/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MemoryStore } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { RedisCacheService } from '@/infrastructure/cache/redis/redis-cache.service';

import { RateLimitFailoverStore } from './rate-limit-failover.store';

import type { RedisReply } from 'rate-limit-redis';
import type { Store } from 'express-rate-limit';
import type { AwilixContainer } from 'awilix';

/**
 * Build the rate limiter's `Store`, wiring in the DI-registered Redis client when available.
 *
 * Resolves the `cache` service from the container and uses its underlying Redis client as the
 * primary store, wrapped in a `RateLimitFailoverStore` for automatic failover to an in-memory
 * store if Redis later becomes unavailable. If the Redis client cannot be resolved at all (the
 * `cache` service isn't registered, or its driver has no connected client), falls back straight
 * to a plain in-memory store and logs a warning, so a missing/broken cache service never
 * prevents the rate limiter — or the app — from starting.
 *
 * @param {AwilixContainer} container - The Awilix DI container.
 * @param {ILogger} logger - Logger used to report the fallback decision.
 * @returns {Store} The store to use for the rate limiter.
 */
export const buildRateLimitStore = (container: AwilixContainer, logger: ILogger): Store => {
  try {
    const cacheService = container.resolve<RedisCacheService>('cache');
    const redisClient = cacheService.getDriver().client();

    if (!redisClient) {
      logger.logWarn('Rate limiter: Redis client is not available, using in-memory store');
      return new MemoryStore();
    }

    const redisStore = new RedisStore({
      sendCommand: (...args: string[]): Promise<RedisReply> => redisClient.sendCommand<RedisReply>(args),
    });

    return new RateLimitFailoverStore(redisStore, new MemoryStore(), logger);
  } catch (error) {
    logger.logWarn('Rate limiter: failed to resolve Redis cache service, using in-memory store', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new MemoryStore();
  }
};
