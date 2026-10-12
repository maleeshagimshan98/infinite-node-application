/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

// Mock dependencies at top level
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

jest.mock('./redis.config', () => ({
  redisConfig: jest.fn(),
}));

jest.mock('./redis.driver');

import { createClient } from 'redis';

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { redisConfig } from './redis.config';
import { RedisDriver } from './redis.driver';
import { redisDriverLoader } from './redis.driver.loader';

import type { RedisClientType } from 'redis';

describe('redisDriverLoader', () => {
  let mockClient: Partial<RedisClientType>;
  let mockDriver: jest.Mocked<RedisDriver>;
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockRedisConfig = redisConfig as jest.MockedFunction<typeof redisConfig>;
  const MockedRedisDriver = RedisDriver as jest.MockedClass<typeof RedisDriver>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock Redis client
    mockClient = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(undefined),
      isOpen: true,
    };

    // Setup mock Driver
    mockDriver = {
      init: jest.fn().mockResolvedValue(undefined),
      client: jest.fn().mockReturnValue(mockClient as RedisClientType),
      config: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
      health: jest.fn().mockResolvedValue({ connected: true, latency: 5 }),
    } as unknown as jest.Mocked<RedisDriver>;

    // Mock createClient to return mock client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateClient.mockReturnValue(mockClient as any);

    // Mock RedisDriver constructor
    MockedRedisDriver.mockImplementation(() => mockDriver);

    // Mock redisConfig
    mockRedisConfig.mockReturnValue({
      driverName: 'redis',
      singleton: true,
      deferred: false,
      params: {
        url: 'redis://localhost:6379',
        ttl: '3600',
        socket: { connectTimeout: 5000 },
        disableOfflineQueue: true,
      },
    });
  });

  it('should create and initialize a RedisDriver instance', async () => {
    const driver = await redisDriverLoader();

    expect(mockRedisConfig).toHaveBeenCalled();
    expect(MockedRedisDriver).toHaveBeenCalledWith(
      expect.objectContaining({
        driverName: 'redis',
        params: expect.any(Object),
      }),
    );
    expect(mockDriver.init).toHaveBeenCalled();
    expect(driver).toBe(mockDriver);
  });

  it('should propagate errors from driver initialization', async () => {
    const initError = new InfrastructureError('Connection failed', 'CONNECTION_ERROR');
    mockDriver.init.mockRejectedValue(initError);

    await expect(redisDriverLoader()).rejects.toThrow(InfrastructureError);
    await expect(redisDriverLoader()).rejects.toThrow('Connection failed');
  });

  it('should propagate errors from driver construction', async () => {
    const constructionError = new InfrastructureError('Invalid configuration', 'DRIVER_ERROR');
    MockedRedisDriver.mockImplementation(() => {
      throw constructionError;
    });

    await expect(redisDriverLoader()).rejects.toThrow(InfrastructureError);
    await expect(redisDriverLoader()).rejects.toThrow('Invalid configuration');
  });
});
