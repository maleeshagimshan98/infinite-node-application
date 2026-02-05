/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IHealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
    redis?: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
  };
  version: string;
}
