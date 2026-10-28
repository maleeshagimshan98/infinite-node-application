/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  MemoryStore: jest.fn().mockImplementation(() => ({ __brand: 'MemoryStore' })),
}));

jest.mock('rate-limit-redis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((options: unknown) => ({ __brand: 'RedisStore', options })),
}));

import { MemoryStore } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { RedisCacheService } from '@/infrastructure/cache/redis/redis-cache.service';

import { RateLimitFailoverStore } from './rate-limit-failover.store';
import { buildRateLimitStore } from './rate-limit-store.factory';

import type { AwilixContainer } from 'awilix';

type FakeRedisClient = { sendCommand: jest.Mock };

describe('buildRateLimitStore', () => {
  let logger: jest.Mocked<ILogger>;
  const MockedMemoryStore = MemoryStore as unknown as jest.Mock;
  const MockedRedisStore = RedisStore as unknown as jest.Mock;

  const makeContainer = (resolveImpl: (token: string) => unknown): AwilixContainer =>
    ({ resolve: jest.fn(resolveImpl) }) as unknown as AwilixContainer;

  const makeCacheService = (client: FakeRedisClient | undefined): RedisCacheService =>
    ({
      getDriver: (): { client: () => FakeRedisClient | undefined } => ({
        client: (): FakeRedisClient | undefined => client,
      }),
    }) as unknown as RedisCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
      logWarn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;
  });

  describe('Redis up', () => {
    it('resolves the client via DI and uses it as the store', () => {
      const sendCommand = jest.fn().mockResolvedValue('OK');
      const cacheService = makeCacheService({ sendCommand });
      const container = makeContainer(() => cacheService);

      const store = buildRateLimitStore(container, logger);

      expect(store).toBeInstanceOf(RateLimitFailoverStore);
      expect(MockedRedisStore).toHaveBeenCalledWith(expect.objectContaining({ sendCommand: expect.any(Function) }));
      expect(logger.logWarn).not.toHaveBeenCalled();

      // The sendCommand option passed to RedisStore must delegate to the resolved Redis client.
      const { sendCommand: passedSendCommand } = MockedRedisStore.mock.calls[0][0] as {
        sendCommand: (...args: string[]) => Promise<unknown>;
      };
      passedSendCommand('PING');
      expect(sendCommand).toHaveBeenCalledWith(['PING']);
    });
  });

  describe('Redis down', () => {
    it('falls back to an in-memory store and warns when the driver has no connected client', () => {
      const cacheService = makeCacheService(undefined);
      const container = makeContainer(() => cacheService);

      const store = buildRateLimitStore(container, logger);

      expect(MockedMemoryStore).toHaveBeenCalledTimes(1);
      expect(store).not.toBeInstanceOf(RateLimitFailoverStore);
      expect(logger.logWarn).toHaveBeenCalledTimes(1);
    });

    it('falls back to an in-memory store and warns, without throwing, when the cache service cannot be resolved', () => {
      const container = makeContainer(() => {
        throw new Error('cache is not registered');
      });

      expect(() => buildRateLimitStore(container, logger)).not.toThrow();
      expect(MockedMemoryStore).toHaveBeenCalledTimes(1);
      expect(logger.logWarn).toHaveBeenCalledTimes(1);
      expect(logger.logWarn).toHaveBeenCalledWith(expect.stringContaining('using in-memory store'), {
        error: 'cache is not registered',
      });
    });
  });
});
