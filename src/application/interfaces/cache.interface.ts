/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from './base.interface';
export interface ICache extends IBaseInfrastructureService {
  serviceName(): 'cache';
  singleton(): true;
  deferred(): false;

  /**
   * Get a cached value by key
   *
   * @param {string} key - Cache key
   * @returns {Promise<T | null>} resolving to the cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL
   *
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Optional time-to-live in seconds
   * @returns {Promise<void>} resolving when value is cached
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a cached value by key
   *
   * @param {string} key - Cache key to delete
   * @returns {Promise<void>} resolving when key is deleted
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached values
   *
   * @returns {Promise<void>} resolving when cache is cleared
   */
  clear(): Promise<void>;
}
