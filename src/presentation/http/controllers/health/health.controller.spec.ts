/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type {
  IHealthCheckResult,
  IServiceHealth,
} from '@/application/interfaces/infrastructure/health-check.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import { HealthService } from '@/domain/health/service/health.service';

import { HealthController } from './health.controller';

import type { IPublicHealthCheckResult } from './health.controller';

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

const SMTP_CLOSED = { name: 'smtp', state: 'closed', failureCount: 0, failureThreshold: 5 } as const;
const SMS_HOST_OPEN = {
  name: 'http https://sms.internal.example',
  state: 'open',
  failureCount: 6,
  failureThreshold: 5,
} as const;
const PUSH_HOST_HALF_OPEN = {
  name: 'http https://push.internal.example',
  state: 'half-open',
  failureCount: 6,
  failureThreshold: 5,
} as const;

const EMAIL_HEALTH: IServiceHealth = { status: 'connected', latency: 40, circuit_breakers: [SMTP_CLOSED] };

const BREAKER_RESULT: IHealthCheckResult = {
  status: 'healthy',
  timestamp: '2026-01-01T00:00:00.000Z',
  uptime: 1,
  version: '1.0.0',
  services: {
    email: EMAIL_HEALTH,
    httpClient: { status: 'connected', circuit_breakers: [SMS_HOST_OPEN, PUSH_HOST_HALF_OPEN] },
  },
};

class TestHealthController extends HealthController {
  publicResult(result: IHealthCheckResult): IPublicHealthCheckResult {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('keeps circuit breaker states but drops their names', () => {
    const publicResult = controller.publicResult(BREAKER_RESULT);

    expect(publicResult.services).toEqual({
      email: {
        status: 'connected',
        latency: 40,
        circuit_breakers: [{ state: 'closed', failureCount: 0, failureThreshold: 5 }],
      },
      httpClient: {
        status: 'connected',
        circuit_breakers: [
          { state: 'open', failureCount: 6, failureThreshold: 5 },
          { state: 'half-open', failureCount: 6, failureThreshold: 5 },
        ],
      },
    });
    expect(JSON.stringify(publicResult)).not.toContain('internal.example');
  });

  it('logs one warning, with the names, for each service whose circuit breakers are not all closed', () => {
    controller.logMessages(BREAKER_RESULT);

    expect(logger.logWarn).toHaveBeenCalledTimes(1);
    expect(logger.logWarn).toHaveBeenCalledWith('Health check: httpClient has 2 circuit breaker(s) not closed', {
      circuit_breakers: [SMS_HOST_OPEN, PUSH_HOST_HALF_OPEN],
    });
  });

  it('logs nothing for closed circuit breakers', () => {
    controller.logMessages({ ...BREAKER_RESULT, services: { email: EMAIL_HEALTH } });

    expect(logger.logWarn).not.toHaveBeenCalled();
  });
});
