/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type {
  IHealthCheck,
  IHealthCheckResult,
  IServiceHealth,
  SystemHealthStatus,
} from '@/application/interfaces/health-check.interface';
import type { IBaseInfrastructureService } from '@/application/interfaces/base.interface';

import type { IDriverHealthStatus } from '../core/driver/core.driver';

/**
 * Infrastructure Health Check Service
 *
 * Aggregates health status from all registered infrastructure services.
 * Implements the IHealthCheck interface for use by domain layer.
 */
export class InfrastructureHealthCheckService implements IHealthCheck {
  private services: Map<string, IBaseInfrastructureService> = new Map();

  /**
   * Register an infrastructure service for health monitoring
   *
   * Called by InfrastructureManager during service initialization
   *
   * @param {IBaseInfrastructureService} service - Infrastructure service instance
   */
  registerService(service: IBaseInfrastructureService): void {
    const serviceName = service.serviceName();
    this.services.set(serviceName, service);
  }

  /**
   * Check health of a single service
   *
   * @param {IBaseInfrastructureService} service - Service to check
   * @returns {Promise<IServiceHealth>}
   */
  private async checkServiceHealth(service: IBaseInfrastructureService): Promise<IServiceHealth> {
    try {
      const driver = service.getDriver();

      // Check if driver has health() method
      if (this.hasHealthMethod(driver)) {
        const healthStatus: IDriverHealthStatus = await driver.health();

        const serviceHealth: IServiceHealth = {
          status: healthStatus.connected ? 'connected' : 'disconnected',
        };
        if (healthStatus.latency !== undefined) {
          serviceHealth.latency = healthStatus.latency;
        }
        if (healthStatus.error !== undefined) {
          serviceHealth.message = healthStatus.error;
        }
        return serviceHealth;
      }

      // Fallback: if driver exists, assume healthy
      if (driver) {
        return { status: 'connected' };
      }
      return {
        status: 'disconnected',
        message: 'Driver not initialized',
      };
    } catch (error) {
      return {
        status: 'disconnected',
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Type guard to check if driver has health() method
   *
   * @param {unknown} driver - Driver to check
   * @returns {driver is { health: () => Promise<IDriverHealthStatus> }}
   */
  private hasHealthMethod(driver: unknown): driver is { health: () => Promise<IDriverHealthStatus> } {
    return (
      typeof driver === 'object' &&
      driver !== null &&
      'health' in driver &&
      typeof (driver as { health: () => Promise<IDriverHealthStatus> }).health === 'function'
    );
  }

  /**
   * Determine overall system health based on individual service statuses
   *
   * @param {Record<string, IServiceHealth>} services - All service health statuses
   * @returns {SystemHealthStatus}
   */
  private determineOverallStatus(services: Record<string, IServiceHealth>): SystemHealthStatus {
    const statuses = Object.entries(services);

    // Critical services (database) must be connected
    const databaseHealth = services['database'];
    if (databaseHealth && databaseHealth.status === 'disconnected') {
      return 'unhealthy';
    }

    // If any service is disconnected, status is degraded
    const hasDisconnected = statuses.some(([_, health]) => health.status === 'disconnected');
    if (hasDisconnected) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Perform comprehensive health check of all infrastructure services
   *
   * @returns {Promise<IHealthCheckResult>}
   */
  async checkHealth(): Promise<IHealthCheckResult> {
    const serviceHealthChecks: [string, Promise<IServiceHealth>][] = [];

    // Check all registered services
    for (const [serviceName, service] of this.services.entries()) {
      serviceHealthChecks.push([serviceName, this.checkServiceHealth(service)]);
    }

    // Wait for all health checks to complete
    const results = await Promise.all(
      serviceHealthChecks.map(async ([name, healthPromise]) => {
        const health = await healthPromise;
        return [name, health] as const;
      }),
    );

    // Build services object with friendly names
    const services: Record<string, IServiceHealth> = {};
    for (const [serviceName, health] of results) {
      // Map service names to friendly names
      const friendlyName = this.getFriendlyServiceName(serviceName);
      services[friendlyName] = health;
    }

    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Map internal service names to friendly display names
   *
   * @param {string} serviceName - Internal service name
   * @returns {string} Friendly name
   */
  private getFriendlyServiceName(serviceName: string): string {
    const nameMap: Record<string, string> = {
      'database-mapper': 'database',
      cache: 'cache',
      storage: 'storage',
      email: 'email',
      queue: 'queue',
      logger: 'logger',
      notification: 'notification',
      socket: 'socket',
    };

    return nameMap[serviceName] || serviceName;
  }
}
