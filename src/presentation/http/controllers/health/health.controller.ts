/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { HealthService } from '@/domain/health/service/health.service';
import APIResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { IHealthCheckResult, IServiceHealth } from '@/application/interfaces/health-check.interface';
import type { ILogger } from '@/application/interfaces/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class HealthController extends BaseController {
  private healthService: HealthService;
  private logger: ILogger;

  constructor(healthService: HealthService, logger: ILogger) {
    super();
    this.healthService = healthService;
    this.logger = logger;
  }

  /**
   * Build the public (unauthenticated) view of a health result: per-service driver messages are
   * dropped because they can carry internal details such as hosts and ports.
   *
   * @param {IHealthCheckResult} result - The full health result from the health service.
   * @returns {IHealthCheckResult} A copy keeping only each service's status and latency.
   */
  protected toPublicHealthResult(result: IHealthCheckResult): IHealthCheckResult {
    const services: IHealthCheckResult['services'] = {};
    for (const [name, health] of Object.entries(result.services)) {
      if (!health) {
        continue;
      }
      const publicHealth: IServiceHealth = { status: health.status };
      if (health.latency !== undefined) {
        publicHealth.latency = health.latency;
      }
      services[name] = publicHealth;
    }
    return { ...result, services };
  }

  /**
   * Log the driver message of every service that reported one, so the details hidden from the
   * public response stay available to operators.
   *
   * @param {IHealthCheckResult} result - The full health result from the health service.
   * @returns {void}
   */
  protected logServiceMessages(result: IHealthCheckResult): void {
    for (const [name, health] of Object.entries(result.services)) {
      if (health?.message !== undefined) {
        this.logger.logWarn(`Health check: ${name} is ${health.status}`, { message: health.message });
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
