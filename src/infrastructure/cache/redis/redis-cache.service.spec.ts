/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { createClient } from 'redis';

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { RedisDriver } from './driver/redis.driver';
import { redisConfig } from './driver/redis.config';
import { RedisCacheService } from './redis-cache.service';

import type { RedisClientType } from 'redis';

// Never connected: every command used by these tests is stubbed.
const client: RedisClientType = createClient();

class StubRedisDriver extends RedisDriver {
  override client(): RedisClientType {
    return client;
  }
}

describe('RedisCacheService error classification', () => {
  const service = new RedisCacheService(new StubRedisDriver(redisConfig()));

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['set', (value: unknown): Promise<void> => service.set('k', value)],
    ['hSet', (value: unknown): Promise<void> => service.hSet('k', 'f', value)],
  ])('%s rethrows a serialization TypeError unchanged without calling Redis', async (method, call) => {
    const setSpy = jest.spyOn(client, 'set');
    const hSetSpy = jest.spyOn(client, 'hSet');
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const thrown = await call(circular).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(TypeError);
    expect(thrown).not.toBeInstanceOf(InfrastructureError);
    expect(method === 'set' ? setSpy : hSetSpy).not.toHaveBeenCalled();
  });

  it('wraps a Redis failure in a CACHE_ERROR carrying the original as data.cause', async () => {
    const redisFailure = new Error('Socket closed unexpectedly');
    jest.spyOn(client, 'hSet').mockRejectedValue(redisFailure);

    const thrown = await service.hSet('k', 'f', { a: 1 }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'CACHE_ERROR', data: { key: 'k', field: 'f', cause: redisFailure } });
  });
});
