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

  /**
   * Set a single field of a hash. The value is JSON-serialized before storage.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name within the hash
   * @param {T} value - Value to store for the field
   * @returns {Promise<void>} resolving when the field is set
   */
  hSet<T>(key: string, field: string, value: T): Promise<void>;

  /**
   * Get a single field of a hash. The stored value is JSON-parsed.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name within the hash
   * @returns {Promise<T | null>} resolving to the parsed value or null if key/field not found
   */
  hGet<T>(key: string, field: string): Promise<T | null>;

  /**
   * Get all fields of a hash as a map. Each value is JSON-parsed.
   *
   * @param {string} key - Hash key
   * @returns {Promise<Record<string, T>>} resolving to a map of fields to parsed values ({} if empty)
   */
  hGetAll<T>(key: string): Promise<Record<string, T>>;

  /**
   * Delete a single field from a hash.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name to delete
   * @returns {Promise<void>} resolving when the field is deleted
   */
  hDel(key: string, field: string): Promise<void>;

  /**
   * Check whether a field exists in a hash.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name to check
   * @returns {Promise<boolean>} resolving to true if the field exists, false otherwise
   */
  hExists(key: string, field: string): Promise<boolean>;
}
