/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Snapshot of a circuit breaker, as reported by the health check
 */
export interface ICircuitBreakerStatus {
  /** The protected dependency (e.g. 'smtp', or 'http <origin>' for an HTTP host); logged, never in the public response */
  name: string;
  state: CircuitState;
  failureCount: number;
  failureThreshold: number;
}
