/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICache } from '@/application/interfaces/cache.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import type { RedisDriver } from './driver/redis.driver';
import type { RedisClientType } from 'redis';

export class RedisCacheService implements ICache {
  /**
   * Redis driver instance used to access the underlying Redis client
   *
   * @type {RedisDriver}
   */
  private readonly driver: RedisDriver;

  /**
   * Redis client instance from the driver layer
   * Used to perform cache operations
   *
   * @type {RedisClientType}
   */
  private readonly redisClient: RedisClientType;

  /**
   * Creates an instance of RedisCacheService
   */
  constructor(driver: RedisDriver) {
    this.driver = driver;
    const redisClient = this.driver.client();
    if (!redisClient || !(redisClient instanceof Object)) {
      throw new InfrastructureError('Invalid Redis client provided to RedisCacheService', 'CONNECTION_ERROR', {
        clientType: typeof redisClient,
        providedClient: redisClient,
      });
    }
    this.redisClient = redisClient;
  }

  /**
   * Get the service name for this cache implementation
   *
   * @returns {'cache'} The service name identifier
   * @example
   * ```typescript
   * const cacheService = new RedisCacheService(redisDriver);
   * console.log(cacheService.serviceName()); // Output: 'cache'
   * ```
   */
  serviceName(): 'cache' {
    return 'cache';
  }

  /**
   * Indicates that this cache service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   * @example
   * ```typescript
   * const cacheService = new RedisCacheService(redisDriver);
   * console.log(cacheService.singleton()); // Output: true
   * ```
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this cache service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   * @example
   * ```typescript
   * const cacheService = new RedisCacheService(redisDriver);
   * console.log(cacheService.deferred()); // Output: false
   * ```
   */
  deferred(): false {
    return false;
  }

  /**
   * Get the underlying Redis client instance
   *
   * @returns {RedisDriver}
   */
  getDriver(): RedisDriver {
    return this.driver;
  }

  /**
   * Get a cached value by key
   *
   * @param {string} key - Cache key
   * @returns {Promise<T | null>} resolving to the cached value or null if not found
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to get cache key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key },
      );
    }
  }

  /**
   * Set a value in cache with optional TTL
   *
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Optional time-to-live in seconds
   * @returns {Promise<void>} resolving when value is cached
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        // Set with expiration time
        await this.redisClient.setEx(key, ttl, serializedValue);
      } else {
        // Set without expiration
        await this.redisClient.set(key, serializedValue);
      }
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to set cache key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key },
      );
    }
  }

  /**
   * Delete a cached value by key
   *
   * @param {string} key - Cache key to delete
   * @returns {Promise<void>} resolving when key is deleted
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to delete cache key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key },
      );
    }
  }

  /**
   * Clear all cached values
   *
   * @returns {Promise<void>} resolving when cache is cleared
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async clear(): Promise<void> {
    try {
      await this.redisClient.flushAll();
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to clear cache: ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
      );
    }
  }

  /**
   * Set a single field of a hash. The value is JSON-serialized before storage.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name within the hash
   * @param {T} value - Value to store for the field
   * @returns {Promise<void>} resolving when the field is set
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async hSet<T>(key: string, field: string, value: T): Promise<void> {
    try {
      await this.redisClient.hSet(key, field, JSON.stringify(value));
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to set cache hash field "${field}" on key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key, field },
      );
    }
  }

  /**
   * Get a single field of a hash. The stored value is JSON-parsed.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name within the hash
   * @returns {Promise<T | null>} resolving to the parsed value or null if key/field not found
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async hGet<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redisClient.hGet(key, field);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to get cache hash field "${field}" on key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key, field },
      );
    }
  }

  /**
   * Get all fields of a hash as a map. Each value is JSON-parsed.
   *
   * @param {string} key - Hash key
   * @returns {Promise<Record<string, T>>} resolving to a map of fields to parsed values ({} if empty)
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    try {
      const entries = await this.redisClient.hGetAll(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(entries)) {
        result[field] = JSON.parse(value) as T;
      }
      return result;
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to get all cache hash fields on key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key },
      );
    }
  }

  /**
   * Delete a single field from a hash.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name to delete
   * @returns {Promise<void>} resolving when the field is deleted
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async hDel(key: string, field: string): Promise<void> {
    try {
      await this.redisClient.hDel(key, field);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to delete cache hash field "${field}" on key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key, field },
      );
    }
  }

  /**
   * Check whether a field exists in a hash.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name to check
   * @returns {Promise<boolean>} resolving to true if the field exists, false otherwise
   * @throws {InfrastructureError} CACHE_ERROR if the Redis operation fails
   */
  async hExists(key: string, field: string): Promise<boolean> {
    try {
      return Boolean(await this.redisClient.hExists(key, field));
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to check cache hash field "${field}" on key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'CACHE_ERROR',
        { key, field },
      );
    }
  }

  /**
   * Gracefully shutdown the Redis connection
   *
   * @returns {Promise<void>}
   * @throws {InfrastructureError} CACHE_ERROR if the connection cannot be closed or force-disconnected
   */
  async shutdown(): Promise<void> {
    try {
      await this.redisClient.quit();
    } catch (error) {
      try {
        // Force disconnect if a graceful quit fails
        await this.redisClient.disconnect();
      } catch (disconnectError: unknown) {
        throw new InfrastructureError(
          `Failed to shut down Redis connection: ${disconnectError instanceof Error ? disconnectError.message : 'Unknown error'}`,
          'CACHE_ERROR',
          { quitError: error instanceof Error ? error.message : String(error) },
        );
      }
    }
  }
}
