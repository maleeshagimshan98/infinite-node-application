/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { CircuitState, ICircuitBreakerStatus } from './circuit-breaker-status.interface';

export interface ICircuitBreakerOptions {
  /** Identifies the protected dependency in errors and logs (e.g. 'smtp') */
  name: string;
  /** Failures tolerated before the circuit opens; 0 opens it on the first failure */
  failureThreshold: number;
  /** Milliseconds the circuit stays open before a single test request is let through */
  resetTimeout: number;
  /** Decides which errors count as a dependency failure; defaults to `error instanceof InfrastructureError` */
  isFailure?: (error: unknown) => boolean;
}

/**
 * Guards calls to a remote dependency: once it keeps failing, calls are rejected without running until a
 * cool-down has passed and a single test request succeeds.
 */
export interface ICircuitBreaker {
  readonly state: CircuitState;
  readonly failureCount: number;

  /**
   * Run a call to the protected dependency, or reject it while the circuit is open.
   *
   * @template T
   * @param {() => Promise<T>} fn - The call to the dependency.
   * @param {(result: T) => boolean} [isFailureResult] - Counts a returned value as a failure (e.g. an HTTP 503
   * response); the caller still receives it unchanged.
   * @returns {Promise<T>} The call's result.
   * @throws {CircuitOpenError} When the circuit rejected the call without running it.
   */
  execute<T>(fn: () => Promise<T>, isFailureResult?: (result: T) => boolean): Promise<T>;

  /**
   * Close the circuit and clear the failure count, cancelling any pending cool-down.
   *
   * @returns {void}
   */
  reset(): void;

  /**
   * Take a snapshot of the circuit for the health check.
   *
   * @returns {ICircuitBreakerStatus} The breaker's name, state, failure count and threshold.
   */
  circuitBreakerStatus(): ICircuitBreakerStatus;
}
