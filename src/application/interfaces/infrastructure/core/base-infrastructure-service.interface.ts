/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';

export interface IBaseInfrastructureService {
  /**
   * The DI registration name of the service. Startup fails unless it equals its factory's `name()`.
   *
   * @returns {string} The registration name.
   */
  serviceName(): string;
  /**
   * Whether the DI container registers the service as a singleton. Startup fails unless it does.
   *
   * @returns {boolean} True for every infrastructure service.
   */
  singleton(): boolean;
  /**
   * Whether the service's creation is deferred in the DI container. Informational: nothing reads it yet.
   *
   * @returns {boolean} True when creation is deferred.
   */
  deferred(): boolean;
  getDriver: () => unknown;

  /**
   * Optional shutdown method for graceful cleanup
   * Implement this to close connections, flush buffers, etc.
   *
   * @returns {Promise<void>} Resolves once the service has released its resources.
   * @throws {InfrastructureError} when the service cannot release its resources. InfrastructureManager logs it
   * and still shuts down the other services.
   */
  shutdown?(): Promise<void>;

  /**
   * Optional method to check if service is shutting down
   *
   * @returns {boolean} True once shutdown has started.
   */
  isShuttingDown?(): boolean;

  /**
   * Optional method for services guarded by circuit breakers, reported by the health check.
   * A service with one breaker per call target (e.g. per HTTP host) returns only those that are not closed.
   *
   * @returns {ICircuitBreakerStatus[]} Each reported breaker's name and state.
   */
  circuitBreakerStatuses?(): ICircuitBreakerStatus[];
}
