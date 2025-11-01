import { cacheServiceLoader } from './cache.service.loader';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { ICacheConfig } from '../../config/service/cache.config';
import type { AwilixContainer } from 'awilix';
import { createClient } from 'redis';
import { createContainer } from 'awilix';

describe('cacheServiceLoader', () => {
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

    const config: ICacheConfig = {
      singleton: true,
      deferred: true,
      driver: 'redis',
      redis: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
    } as ICacheConfig;

    await cacheServiceLoader('cache', mockContainer, config);
    expect(createClient).toHaveBeenCalledWith(config.redis);
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRegister).toHaveBeenCalledWith({
      cacheClient: expect.any(Object),
    });
  });

  it('should handle Redis client error event', async () => {
    const mockClient = { on: jest.fn((event, cb) => event === 'error' && cb(new Error('fail'))) };
    (createClient as jest.Mock).mockReturnValue(mockClient);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const config: ICacheConfig = {
      driver: 'redis',
      redis: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
      deferred: true,
      singleton: true,
    } as ICacheConfig;

    await cacheServiceLoader('cache', mockContainer, config);

    expect(logSpy).toHaveBeenCalledWith('Redis Client Error', expect.any(Error));
    logSpy.mockRestore();
  });

  it('should throw InfiniteNodeError for unsupported driver', () => {
    const config: ICacheConfig = {
      driver: 'memory',
      redis: { url: '', ttl: '', connectionTimeout: '' },
      deferred: true,
      singleton: true,
    } as ICacheConfig;

    expect(() => cacheServiceLoader('cache', mockContainer, config)).toThrow(InfiniteNodeError);
    expect(() => cacheServiceLoader('cache', mockContainer, config)).toThrow(/not supported/);
  });

  it('should throw InfiniteNodeError on Redis client creation failure', () => {
    (createClient as jest.Mock).mockImplementation(() => {
      throw new Error('Redis creation failed');
    });

    const config: ICacheConfig = {
      driver: 'redis',
      redis: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
      deferred: true,
    } as ICacheConfig;

    expect(() => cacheServiceLoader('cache', mockContainer, config)).toThrow(InfiniteNodeError);
    expect(() => cacheServiceLoader('cache', mockContainer, config)).toThrow(/Failed to load CacheService/);
  });

  it('should create and register a real Redis client and perform basic operations', async () => {
    jest.unmock('redis');
    const config: ICacheConfig = {
      driver: 'redis',
      redis: { url: 'redis://localhost:6379', ttl: '3600', connectionTimeout: '5000' },
      deferred: true,
    } as ICacheConfig;

    const container: AwilixContainer = createContainer();
    await cacheServiceLoader('cache', container, config);
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
