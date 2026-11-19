/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';
export interface ICache extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'cache'} Always `cache`.
   */
  serviceName(): 'cache';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;

  /**
   * Get a cached value by key
   *
   * @param {string} key - Cache key
   * @returns {Promise<T | null>} resolving to the cached value or null if not found
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL
   *
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Optional time-to-live in seconds
   * @returns {Promise<void>} resolving when value is cached
   * @throws {TypeError} when `value` cannot be JSON-serialized (circular structure, BigInt).
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a cached value by key
   *
   * @param {string} key - Cache key to delete
   * @returns {Promise<void>} resolving when key is deleted
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached values
   *
   * @returns {Promise<void>} resolving when cache is cleared
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  clear(): Promise<void>;

  /**
   * Set a single field of a hash. The value is JSON-serialized before storage.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name within the hash
   * @param {T} value - Value to store for the field
   * @returns {Promise<void>} resolving when the field is set
   * @throws {TypeError} when `value` cannot be JSON-serialized (circular structure, BigInt).
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  hSet<T>(key: string, field: string, value: T): Promise<void>;

  /**
   * Get a single field of a hash. The stored value is JSON-parsed.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name within the hash
   * @returns {Promise<T | null>} resolving to the parsed value or null if key/field not found
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  hGet<T>(key: string, field: string): Promise<T | null>;

  /**
   * Get all fields of a hash as a map. Each value is JSON-parsed.
   *
   * @param {string} key - Hash key
   * @returns {Promise<Record<string, T>>} resolving to a map of fields to parsed values ({} if empty)
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  hGetAll<T>(key: string): Promise<Record<string, T>>;

  /**
   * Delete a single field from a hash.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name to delete
   * @returns {Promise<void>} resolving when the field is deleted
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  hDel(key: string, field: string): Promise<void>;

  /**
   * Check whether a field exists in a hash.
   *
   * @param {string} key - Hash key
   * @param {string} field - Field name to check
   * @returns {Promise<boolean>} resolving to true if the field exists, false otherwise
   * @throws {InfrastructureError} CACHE_ERROR when the cache operation fails.
   */
  hExists(key: string, field: string): Promise<boolean>;
}
