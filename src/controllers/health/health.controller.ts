/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Request, Response } from 'express';
import { BaseController } from '../base.controller';
import HealthService from '../../services/health/health.service';
import APIResponseUtils from '../../app/core/utils/api-response/api-response-utils';

class HealthController extends BaseController {
  private healthService: HealthService;

  constructor() {
    super();
    this.healthService = new HealthService();
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

      const statusCode = healthData.status === 'healthy' ? 200 : 503;
      const apiResponse = APIResponseUtils.apiOkResponse(
        statusCode,
        false,
        null,
        `Service is ${healthData.status}`,
        healthData,
      );

      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    } catch (error) {
      console.error('Health check error:', error);
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
      console.error('Liveness probe error:', error);
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

      // Only ready if healthy
      const statusCode = healthData.status === 'healthy' ? 200 : 503;
      const apiResponse = APIResponseUtils.apiOkResponse(
        statusCode,
        false,
        null,
        `Service is ${healthData.status === 'healthy' ? 'ready' : 'not ready'}`,
        healthData,
      );

      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    } catch (error) {
      console.error('Readiness probe error:', error);
      const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }
  }
}

export default HealthController;
