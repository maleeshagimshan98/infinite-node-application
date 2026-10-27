/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import type {
  ICircuitBreaker,
  ICircuitBreakerOptions,
} from '@/application/interfaces/circuit-breaker/circuit-breaker.interface';
import type {
  CircuitState,
  ICircuitBreakerStatus,
} from '@/application/interfaces/circuit-breaker/circuit-breaker-status.interface';

/**
 * Circuit breaker for a remote dependency.
 *
 * - closed: every call runs. A counted failure adds one to the failure count and a success takes one off, so the
 *   circuit opens only once failures outnumber successes by more than `failureThreshold`.
 * - open: calls are rejected with CircuitOpenError without running, until `resetTimeout` has passed.
 * - half-open: exactly one call runs as a test request while the rest are rejected. Its success closes the
 *   circuit; its failure reopens it for another `resetTimeout`.
 *
 * Every call that ran settles with its own result or error, including the one that opens the circuit.
 * A test request that never settles keeps the circuit half-open, so the protected calls must have timeouts.
 *
 * @class CircuitBreaker
 * @implements {ICircuitBreaker}
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({ name: 'smtp', failureThreshold: 5, resetTimeout: 30000 });
 * await breaker.execute(() => transporter.sendMail(message));
 * ```
 */
export class CircuitBreaker implements ICircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly isFailure: (error: unknown) => boolean;

  private _state: CircuitState = 'closed';
  private _failureCount = 0;
  private probeInFlight = false;
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  constructor({ name, failureThreshold, resetTimeout, isFailure }: ICircuitBreakerOptions) {
    if (!Number.isInteger(failureThreshold) || failureThreshold < 0) {
      throw new RangeError(
        `Circuit breaker "${name}": failureThreshold must be a non-negative integer, got ${failureThreshold}`,
      );
    }
    if (!Number.isFinite(resetTimeout) || resetTimeout <= 0) {
      throw new RangeError(`Circuit breaker "${name}": resetTimeout must be a positive number, got ${resetTimeout}`);
    }
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.isFailure = isFailure ?? ((error: unknown): boolean => error instanceof InfrastructureError);
  }

  get state(): CircuitState {
    return this._state;
  }

  get failureCount(): number {
    return this._failureCount;
  }

  /**
   * Take a snapshot of the circuit for the health check.
   *
   * @returns {ICircuitBreakerStatus} The breaker's name, state, failure count and threshold.
   */
  circuitBreakerStatus(): ICircuitBreakerStatus {
    return {
      name: this.name,
      state: this._state,
      failureCount: this._failureCount,
      failureThreshold: this.failureThreshold,
    };
  }

  /**
   * Run a call to the protected dependency, or reject it while the circuit is open or a test request is running.
   *
   * @template T
   * @param {() => Promise<T>} fn - The call to the dependency.
   * @param {(result: T) => boolean} [isFailureResult] - Counts a returned value as a failure (e.g. an HTTP 503
   * response); the caller still receives it unchanged.
   * @returns {Promise<T>} The call's result.
   * @throws {CircuitOpenError} CONNECTION_ERROR when the circuit rejected the call without running it.
   * @throws {unknown} Whatever `fn` threw, unchanged — whether or not it counted as a failure.
   */
  async execute<T>(fn: () => Promise<T>, isFailureResult?: (result: T) => boolean): Promise<T> {
    if (this._state === 'open' || (this._state === 'half-open' && this.probeInFlight)) {
      throw new CircuitOpenError(`Circuit breaker "${this.name}" rejected the call (state: ${this._state})`, {
        breaker: this.name,
        state: this._state,
      });
    }

    const isProbe = this._state === 'half-open';
    if (isProbe) {
      this.probeInFlight = true;
    }
    try {
      const result = await fn();
      if (isFailureResult?.(result)) {
        this.recordFailure(isProbe);
      } else {
        this.recordSuccess(isProbe);
      }
      return result;
    } catch (error: unknown) {
      // Errors isFailure rejects are the caller's problem, not the dependency's, and leave the circuit untouched.
      if (this.isFailure(error)) {
        this.recordFailure(isProbe);
      }
      throw error;
    } finally {
      if (isProbe) {
        this.probeInFlight = false;
      }
    }
  }

  /**
   * Close the circuit and clear the failure count, cancelling any pending cool-down.
   *
   * @returns {void}
   */
  reset(): void {
    this.clearResetTimer();
    this._state = 'closed';
    this._failureCount = 0;
  }

  /**
   * Apply a successful call to the circuit, judged by the state it settled in — a slow call that started before
   * the circuit opened says nothing about the dependency now.
   *
   * @param {boolean} isProbe - Whether the call was the half-open test request.
   * @returns {void}
   */
  private recordSuccess(isProbe: boolean): void {
    if (isProbe && this._state === 'half-open') {
      this.reset();
    } else if (this._state === 'closed') {
      this._failureCount = Math.max(0, this._failureCount - 1);
    }
  }

  /**
   * Apply a counted failure to the circuit, judged by the state it settled in.
   *
   * @param {boolean} isProbe - Whether the call was the half-open test request.
   * @returns {void}
   */
  private recordFailure(isProbe: boolean): void {
    if (isProbe && this._state === 'half-open') {
      this.open();
    } else if (this._state === 'closed') {
      this._failureCount++;
      if (this._failureCount > this.failureThreshold) {
        this.open();
      }
    }
  }

  /**
   * Open the circuit and schedule the move to half-open after `resetTimeout`, replacing any pending cool-down.
   *
   * @returns {void}
   */
  private open(): void {
    this._state = 'open';
    this.clearResetTimer();
    this.resetTimer = setTimeout(() => {
      this.resetTimer = undefined;
      this._state = 'half-open';
    }, this.resetTimeout);
    // A pending cool-down must not keep the process alive at shutdown.
    this.resetTimer.unref();
  }

  /**
   * Cancel the pending cool-down, if any.
   *
   * @returns {void}
   */
  private clearResetTimer(): void {
    if (this.resetTimer !== undefined) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }
}
