import { createClient } from 'redis';
import { createContainer } from 'awilix';

import { redisDriverLoader } from '../redis.driver.loader';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';

import type { IRedisConfig } from '../../../config/drivers/redis.config';
import type { AwilixContainer } from 'awilix';

describe('cacheDriverLoader', () => {
  let mockContainer: AwilixContainer;
  let mockRegister: jest.Mock;

  jest.mock('redis', () => ({
    createClient: jest.fn(),
  }));

  beforeEach(() => {
    mockRegister = jest.fn();
    mockContainer = { register: mockRegister } as unknown as AwilixContainer;
    jest.clearAllMocks();
  });

  it('should register Redis client when driver is "redis"', async () => {
    const mockClient = { on: jest.fn() };
    (createClient as jest.Mock).mockReturnValue(mockClient);

    const config: IRedisConfig = {
      driverName: 'redis',
      singleton: true,
      deferred: true,
      driver: 'redis',
      params: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
    } as IRedisConfig;

    await redisDriverLoader(mockContainer, config);
    expect(createClient).toHaveBeenCalledWith(config.params);
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRegister).toHaveBeenCalledWith({
      cacheClient: expect.any(Object),
    });
  });

  it('should handle Redis client error event', async () => {
    const mockClient = { on: jest.fn((event, cb) => event === 'error' && cb(new Error('fail'))) };
    (createClient as jest.Mock).mockReturnValue(mockClient);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const config: IRedisConfig = {
      driverName: 'redis',
      params: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
      deferred: true,
      singleton: true,
    } as IRedisConfig;

    await redisDriverLoader(mockContainer, config);

    expect(logSpy).toHaveBeenCalledWith('Redis Client Error', expect.any(Error));
    logSpy.mockRestore();
  });

  it('should throw InfiniteNodeError for unsupported driver', () => {
    const config: IRedisConfig = {
      driverName: 'redis',
      params: { url: '', ttl: '', connectionTimeout: '' },
      deferred: true,
      singleton: true,
    } as IRedisConfig;

    expect(() => redisDriverLoader(mockContainer, config)).toThrow(InfiniteNodeError);
    expect(() => redisDriverLoader(mockContainer, config)).toThrow(/not supported/);
  });

  it('should throw InfiniteNodeError on Redis client creation failure', () => {
    (createClient as jest.Mock).mockImplementation(() => {
      throw new Error('Redis creation failed');
    });

    const config: IRedisConfig = {
      driverName: 'redis',
      params: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
      deferred: true,
    } as IRedisConfig;

    expect(() => redisDriverLoader(mockContainer, config)).toThrow(InfiniteNodeError);
    expect(() => redisDriverLoader(mockContainer, config)).toThrow(/Failed to load CacheService/);
  });

  it('should create and register a real Redis client and perform basic operations', async () => {
    jest.unmock('redis');
    const config: IRedisConfig = {
      driverName: 'redis',
      params: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
      deferred: true,
    } as IRedisConfig;

    const container: AwilixContainer = createContainer();
    await redisDriverLoader(container, config);
    const client = container.resolve('cache');

    // Test Redis client operations
    await client.connect();
    await client.set('integration-test-key', 'integration-test-value');
    const value = await client.get('integration-test-key');
    expect(value).toBe('integration-test-value');
    await client.del('integration-test-key');
    await client.disconnect();
  });
});
