/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { RedisClientType } from 'redis';
import type { ICache } from '@/application/interfaces/cache.interface';

export class RedisCacheService implements ICache {
  /**
   * Creates an instance of RedisCacheService
   *
   * @param {RedisClientType} redisClient - Redis client instance from the driver layer
   */
  constructor(private readonly redisClient: RedisClientType) {}

  /**
   * Get a cached value by key
   *
   * @param {string} key - Cache key
   * @returns {Promise<T | null>} resolving to the cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  }

  /**
   * Set a value in cache with optional TTL
   *
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Optional time-to-live in seconds
   * @returns {Promise<void>} resolving when value is cached
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);

    if (ttl) {
      // Set with expiration time
      await this.redisClient.setEx(key, ttl, serializedValue);
    } else {
      // Set without expiration
      await this.redisClient.set(key, serializedValue);
    }
  }

  /**
   * Delete a cached value by key
   *
   * @param {string} key - Cache key to delete
   * @returns {Promise<void>} resolving when key is deleted
   */
  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /**
   * Clear all cached values
   *
   * @returns {Promise<void>} resolving when cache is cleared
   */
  async clear(): Promise<void> {
    await this.redisClient.flushAll();
  }
}
