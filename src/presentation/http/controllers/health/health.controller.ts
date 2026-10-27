/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { HealthService } from '@/domain/health/service/health.service';
import APIResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { IHealthCheckResult, IServiceHealth } from '@/application/interfaces/health-check.interface';
import type { ILogger } from '@/application/interfaces/logger.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/circuit-breaker/circuit-breaker-status.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

/**
 * A service's health as shown on the unauthenticated endpoint: no driver message, and circuit breakers without
 * their names (an HTTP breaker's name is a host origin).
 */
export interface IPublicServiceHealth {
  status: IServiceHealth['status'];
  latency?: number;
  circuit_breakers?: Omit<ICircuitBreakerStatus, 'name'>[];
}

export interface IPublicHealthCheckResult extends Omit<IHealthCheckResult, 'services'> {
  services: Record<string, IPublicServiceHealth>;
}

export class HealthController extends BaseController {
  private healthService: HealthService;

  constructor(healthService: HealthService, logger: ILogger) {
    super(logger);
    this.healthService = healthService;
  }

  /**
   * Build the public (unauthenticated) view of a health result: per-service driver messages and circuit
   * breaker names are dropped because they can carry internal details such as hosts and ports.
   *
   * @param {IHealthCheckResult} result - The full health result from the health service.
   * @returns {IPublicHealthCheckResult} A copy keeping each service's status, latency and breaker states.
   */
  protected toPublicHealthResult(result: IHealthCheckResult): IPublicHealthCheckResult {
    const services: IPublicHealthCheckResult['services'] = {};
    for (const [name, health] of Object.entries(result.services)) {
      if (!health) {
        continue;
      }
      const publicHealth: IPublicServiceHealth = { status: health.status };
      if (health.latency !== undefined) {
        publicHealth.latency = health.latency;
      }
      if (health.circuit_breakers !== undefined) {
        publicHealth.circuit_breakers = health.circuit_breakers.map(({ state, failureCount, failureThreshold }) => ({
          state,
          failureCount,
          failureThreshold,
        }));
      }
      services[name] = publicHealth;
    }
    return { ...result, services };
  }

  /**
   * Log the driver message of every service that reported one, and the circuit breakers that are not closed,
   * so the details hidden from the public response stay available to operators. Closed breakers are not
   * logged, so a healthy system adds no log lines.
   *
   * @param {IHealthCheckResult} result - The full health result from the health service.
   * @returns {void}
   */
  protected logServiceMessages(result: IHealthCheckResult): void {
    for (const [name, health] of Object.entries(result.services)) {
      if (health?.message !== undefined) {
        this.logger.logWarn(`Health check: ${name} is ${health.status}`, { message: health.message });
      }
      const notClosed = health?.circuit_breakers?.filter((circuitBreaker) => circuitBreaker.state !== 'closed') ?? [];
      if (notClosed.length > 0) {
        this.logger.logWarn(`Health check: ${name} has ${notClosed.length} circuit breaker(s) not closed`, {
          circuit_breakers: notClosed,
        });
      }
    }
  }

  /**
   * Get health status - Main health check endpoint
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} API response with health status (200 if healthy, 503 if unhealthy)
   */
  async check(req: Request, res: Response): Promise<Response> {
    try {
      const healthData = await this.healthService.check();
      this.logServiceMessages(healthData);

      const statusCode = healthData.status === 'healthy' ? 200 : 503;
      const apiResponse = APIResponseUtils.apiOkResponse(
        statusCode,
        false,
        null,
        `Service is ${healthData.status}`,
        this.toPublicHealthResult(healthData),
      );

      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    } catch (error) {
      this.logger.logError('Health check error', { error });
      const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }
  }

  /**
   * Liveness probe - Quick check if service is alive
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} API response indicating service is alive (200)
   */
  async live(req: Request, res: Response): Promise<Response> {
    try {
      const apiResponse = APIResponseUtils.apiOkResponse(200, false, null, 'Service is alive', {
        status: 'alive',
        timestamp: new Date().toISOString(),
      });

      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    } catch (error) {
      this.logger.logError('Liveness probe error', { error });
      const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }
  }

  /**
   * Readiness probe - Full check if service is ready to accept traffic
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} API response with health status (200 if ready, 503 if not ready)
   */
  async ready(req: Request, res: Response): Promise<Response> {
    try {
      const healthData = await this.healthService.check();
      this.logServiceMessages(healthData);

      // Only ready if healthy
      const statusCode = healthData.status === 'healthy' ? 200 : 503;
      const apiResponse = APIResponseUtils.apiOkResponse(
        statusCode,
        false,
        null,
        `Service is ${healthData.status === 'healthy' ? 'ready' : 'not ready'}`,
        this.toPublicHealthResult(healthData),
      );

      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    } catch (error) {
      this.logger.logError('Readiness probe error', { error });
      const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }
  }
}

export default HealthController;
