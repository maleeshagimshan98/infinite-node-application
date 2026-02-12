/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { BaseService } from '../base/BaseService';

import type mongoose from 'mongoose';
import type { RedisClientType } from 'redis';
import type { IHealthCheckResponse } from '../../models/DTO/health-check.model';

class HealthService extends BaseService {
  private mongooseConnection: typeof mongoose | null = null;
  private redisClient: RedisClientType | null = null;

  /**
   * Constructor - resolves database and redis services from DI container
   *
   */
  constructor() {
    super();
  }

  /**
   * Perform comprehensive health check
   *
   * @returns {Promise<IHealthCheckResponse>} Health check response containing status, uptime, and service details
   */
  async check(): Promise<IHealthCheckResponse> {
    const dbStatus = await this.checkDatabase();
    const redisStatus = await this.checkRedis();
    const overallStatus = this.determineStatus(dbStatus, redisStatus);

    const response: IHealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      version: process.env.npm_package_version || '1.0.0',
    };

    return response;
  }

  /**
   * Check MongoDB connection and measure latency
   *
   * @private
   * @returns {Promise<{ status: 'connected' | 'disconnected'; latency?: number }>} Database connection status and latency in milliseconds
   */
  private async checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; latency?: number }> {
    try {
      this.mongooseConnection = this.container.resolve('mongoose');
      if (!this.mongooseConnection) {
        throw new Error('Mongoose connection not initialized');
      }
      if (!this.redisClient) {
        throw new Error('Redis client not initialized');
      }
      const start = process.hrtime.bigint();

      // Ensure mongoose connection is in connected state (1 = connected)
      if (this.mongooseConnection.connection.readyState !== 1) {
        return { status: 'disconnected' };
      }

      // Ping the database
      await this.mongooseConnection.connection.db?.admin().ping();
      const end = process.hrtime.bigint();
      const latency = Number((end - start) / BigInt(1000000)); // nanoseconds -> ms

      return {
        status: 'connected',
        latency,
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'disconnected',
      };
    }
  }

  /**
   * Check Redis connection and measure latency
   *
   * @private
   * @returns {Promise<{ status: 'connected' | 'disconnected'; latency?: number }>}
   */
  private async checkRedis(): Promise<{ status: 'connected' | 'disconnected'; latency?: number }> {
    try {
      this.redisClient = this.container.resolve('cache', { allowUnregistered: true });
      if (!this.redisClient) {
        return { status: 'disconnected' };
      }

      const start = process.hrtime.bigint();
      await this.redisClient.ping();
      const end = process.hrtime.bigint();
      const latency = Number((end - start) / BigInt(1000000));
      return { status: 'connected', latency };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return { status: 'disconnected' };
    }
  }

  /**
   * Determine overall health status based on service statuses
   *
   * @private
   * @param dbStatus - Database connection status
   * @param redisStatus - Redis connection status
   * @returns {'healthy' | 'unhealthy' | 'degraded'} Overall health status
   */
  private determineStatus(
    dbStatus: { status: 'connected' | 'disconnected'; latency?: number },
    redisStatus: { status: 'connected' | 'disconnected'; latency?: number } | undefined,
  ): 'healthy' | 'unhealthy' | 'degraded' {
    // Unhealthy if database is down (critical)
    if (dbStatus.status === 'disconnected') return 'unhealthy';

    // Degraded if redis is down (optional/cache)
    if (!redisStatus || redisStatus.status === 'disconnected') return 'degraded';

    return 'healthy';
  }
}

export default HealthService;
