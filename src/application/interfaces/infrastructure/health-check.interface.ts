/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';

/**
 * Health status for individual service components
 */
export type ServiceHealthStatus = 'connected' | 'disconnected';

/**
 * Overall system health status
 */
export type SystemHealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Health check result for an individual infrastructure service
 */
export interface IServiceHealth {
  status: ServiceHealthStatus;
  latency?: number; // in milliseconds
  message?: string;
  circuit_breakers?: ICircuitBreakerStatus[];
}

/**
 * Complete health check response
 */
export interface IHealthCheckResult {
  status: SystemHealthStatus;
  timestamp: string;
  uptime: number;
  services: {
    database?: IServiceHealth;
    cache?: IServiceHealth;
    storage?: IServiceHealth;
    email?: IServiceHealth;
    queue?: IServiceHealth;
    [key: string]: IServiceHealth | undefined;
  };
  version: string;
}

/**
 * Health Check Service Interface
 *
 * Provides health check capabilities for the application.
 * Infrastructure layer implements this to report on all registered services.
 */
export interface IHealthCheck {
  /**
   * Perform comprehensive health check of all infrastructure services
   *
   * @returns {Promise<IHealthCheckResult>} Complete health status
   */
  checkHealth: () => Promise<IHealthCheckResult>;
}
