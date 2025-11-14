/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mongoose from 'mongoose';

export interface IHealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
  };
  version: string;
}

class HealthService {
  /**
   * Perform comprehensive health check
   *
   * @returns {Promise<IHealthCheckResponse>} Health check response containing status, uptime, and service details
   */
  async check(): Promise<IHealthCheckResponse> {
    const dbStatus = await this.checkDatabase();
    const overallStatus = this.determineStatus(dbStatus);

    const response: IHealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
      },
      version: process.env.npm_package_version || '1.0.0',
    };

    return response;
  }

  /**
   * Check MongoDB connection
   *
   * @private
   * @returns {Promise<{ status: 'connected' | 'disconnected'; latency?: number }>} Database connection status and latency
   */
  private async checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; latency?: number }> {
    try {
      const start = Date.now();
      await mongoose.connection.db?.admin().ping();
      const latency = Date.now() - start;

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
   * Determine overall health status based on service status
   *
   * @private
   * @param {object} dbStatus - Database connection status
   * @param {string} dbStatus.status - Connection status ('connected' or 'disconnected')
   * @param {number} [dbStatus.latency] - Optional latency in milliseconds
   * @returns {'healthy' | 'unhealthy' | 'degraded'} Overall health status
   */
  private determineStatus(dbStatus: {
    status: 'connected' | 'disconnected';
    latency?: number;
  }): 'healthy' | 'unhealthy' | 'degraded' {
    // Unhealthy if database is down
    if (dbStatus.status === 'disconnected') {
      return 'unhealthy';
    }

    return 'healthy';
  }
}

export default HealthService;
