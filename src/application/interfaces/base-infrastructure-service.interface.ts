/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICircuitBreakerStatus } from '@/application/interfaces/circuit-breaker/circuit-breaker-status.interface';

export interface IBaseInfrastructureService {
  serviceName(): string;
  singleton(): boolean;
  deferred(): boolean;
  getDriver: () => unknown;

  /**
   * Optional shutdown method for graceful cleanup
   * Implement this to close connections, flush buffers, etc.
   */
  shutdown?(): Promise<void>;

  /**
   * Optional method to check if service is shutting down
   */
  isShuttingDown?(): boolean;

  /**
   * Optional method for services guarded by circuit breakers, reported by the health check.
   * A service with one breaker per call target (e.g. per HTTP host) returns only those that are not closed.
   */
  circuitBreakerStatuses?(): ICircuitBreakerStatus[];
}
