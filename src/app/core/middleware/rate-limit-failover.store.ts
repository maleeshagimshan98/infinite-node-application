/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ILogger } from '@/application/interfaces/logger.interface';

import type { IncrementResponse, Options, Store } from 'express-rate-limit';

/**
 * A rate-limit `Store` that wraps a primary store (typically Redis-backed) and a fallback
 * store (typically in-memory), retrying the primary on every call and transparently failing
 * over to the fallback when the primary throws or rejects.
 *
 * @class RateLimitFailoverStore
 * @implements {Store}
 */
export class RateLimitFailoverStore implements Store {
  /**
   * Whether the primary store's last attempted call succeeded. Used to log a warning/recovery
   * message only on the health-state transition, not on every call while the primary is down.
   */
  private isPrimaryHealthy = true;

  constructor(
    private readonly primaryStore: Store,
    private readonly fallbackStore: Store,
    private readonly logger: ILogger,
  ) {}

  /**
   * Initialize both the primary and fallback stores with the rate limiter's options.
   *
   * @param {Options} options - The options used to configure express-rate-limit.
   * @returns {void}
   */
  init(options: Options): void {
    this.primaryStore.init?.(options);
    this.fallbackStore.init?.(options);
  }

  /**
   * Increment a client's hit counter, using the primary store and failing over to the
   * fallback store if the primary is unavailable.
   *
   * @param {string} key - The identifier for a client.
   * @returns {Promise<IncrementResponse>} The number of hits and reset time for the client.
   */
  increment(key: string): Promise<IncrementResponse> {
    return this.withFailover((store) => store.increment(key));
  }

  /**
   * Decrement a client's hit counter, using the primary store and failing over to the
   * fallback store if the primary is unavailable.
   *
   * @param {string} key - The identifier for a client.
   * @returns {Promise<void>}
   */
  decrement(key: string): Promise<void> {
    return this.withFailover((store) => store.decrement(key));
  }

  /**
   * Reset a client's hit counter, using the primary store and failing over to the fallback
   * store if the primary is unavailable.
   *
   * @param {string} key - The identifier for a client.
   * @returns {Promise<void>}
   */
  resetKey(key: string): Promise<void> {
    return this.withFailover((store) => store.resetKey(key));
  }

  /**
   * Run an operation against the primary store, falling back to the fallback store if the
   * primary throws or rejects. Logs a warning on the healthy-to-unhealthy transition and an
   * info message on recovery, rather than on every call.
   *
   * @param {(store: Store) => Promise<T> | T} operation - The store operation to run.
   * @returns {Promise<T>} The result of the operation, from whichever store served it.
   */
  private async withFailover<T>(operation: (store: Store) => Promise<T> | T): Promise<T> {
    try {
      const result = await operation(this.primaryStore);
      this.onPrimarySuccess();
      return result;
    } catch (error) {
      this.onPrimaryFailure(error);
      return operation(this.fallbackStore);
    }
  }

  /**
   * Record a failed primary-store operation, logging a warning only on the transition from
   * healthy to unhealthy.
   *
   * @param {unknown} error - The error thrown/rejected by the primary store.
   * @returns {void}
   */
  private onPrimaryFailure(error: unknown): void {
    if (this.isPrimaryHealthy) {
      this.isPrimaryHealthy = false;
      this.logger.logWarn('Rate limiter: Redis store unavailable, falling back to in-memory store', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record a successful primary-store operation, logging a recovery message only on the
   * transition from unhealthy to healthy.
   *
   * @returns {void}
   */
  private onPrimarySuccess(): void {
    if (!this.isPrimaryHealthy) {
      this.isPrimaryHealthy = true;
      this.logger.logInfo('Rate limiter: Redis store recovered, resuming Redis-backed rate limiting');
    }
  }
}
