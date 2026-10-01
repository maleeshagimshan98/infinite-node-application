/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IHealthCheckResult } from '@/application/interfaces/health-check.interface';
import type { ILogger } from '@/application/interfaces/logger.interface';
import { HealthService } from '@/domain/health/service/health.service';

import { HealthController } from './health.controller';

const RESULT: IHealthCheckResult = {
  status: 'degraded',
  timestamp: '2026-01-01T00:00:00.000Z',
  uptime: 1,
  version: '1.0.0',
  services: {
    database: { status: 'connected', latency: 3 },
    cache: { status: 'disconnected', message: 'connect ECONNREFUSED 10.0.0.5:6379' },
  },
};

class TestHealthController extends HealthController {
  publicResult(result: IHealthCheckResult): IHealthCheckResult {
    return this.toPublicHealthResult(result);
  }

  logMessages(result: IHealthCheckResult): void {
    this.logServiceMessages(result);
  }
}

describe('HealthController public health result', () => {
  const logger: ILogger = {
    serviceName: () => 'logger',
    singleton: () => true,
    deferred: () => false,
    getDriver: () => null,
    logInfo: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logWarn: jest.fn(),
  };
  const controller = new TestHealthController(
    new HealthService({ checkHealth: async (): Promise<IHealthCheckResult> => RESULT }),
    logger,
  );

  it('drops per-service driver messages and keeps status and latency', () => {
    const publicResult = controller.publicResult(RESULT);

    expect(publicResult.services).toEqual({
      database: { status: 'connected', latency: 3 },
      cache: { status: 'disconnected' },
    });
    expect(JSON.stringify(publicResult)).not.toContain('10.0.0.5');
    expect(publicResult.status).toBe('degraded');
  });

  it('logs the raw driver message of each service that reported one', () => {
    controller.logMessages(RESULT);

    expect(logger.logWarn).toHaveBeenCalledTimes(1);
    expect(logger.logWarn).toHaveBeenCalledWith('Health check: cache is disconnected', {
      message: 'connect ECONNREFUSED 10.0.0.5:6379',
    });
  });
});
