/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/base-infrastructure-service.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/circuit-breaker/circuit-breaker-status.interface';
import type { IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';

import { InfrastructureHealthCheckService } from './infrastructure-health-check.service';

const OPEN_HOST: ICircuitBreakerStatus = {
  name: 'http https://sms.example',
  state: 'open',
  failureCount: 6,
  failureThreshold: 5,
};

/**
 * Build a fake infrastructure service whose driver reports the given health.
 *
 * @param {string} name - The service name.
 * @param {() => Promise<IDriverHealthStatus>} health - The driver's health check.
 * @param {ICircuitBreakerStatus[]} [circuitBreakers] - What `circuitBreakerStatuses()` returns; omitted means the
 * service has no breakers.
 * @returns {IBaseInfrastructureService} The fake service.
 */
function fakeService(
  name: string,
  health: () => Promise<IDriverHealthStatus>,
  circuitBreakers?: ICircuitBreakerStatus[],
): IBaseInfrastructureService {
  const service: IBaseInfrastructureService = {
    serviceName: () => name,
    singleton: () => true,
    deferred: () => false,
    getDriver: () => ({ health }),
  };
  if (circuitBreakers !== undefined) {
    service.circuitBreakerStatuses = (): ICircuitBreakerStatus[] => circuitBreakers;
  }
  return service;
}

const connected = async (): Promise<IDriverHealthStatus> => ({ connected: true, latency: 2 });

describe('InfrastructureHealthCheckService circuit breakers', () => {
  it('adds the circuit breaker statuses of a service that has breakers', async () => {
    const healthCheck = new InfrastructureHealthCheckService();
    healthCheck.registerService(fakeService('httpClient', connected, [OPEN_HOST]));

    const result = await healthCheck.checkHealth();

    expect(result.services.httpClient).toEqual({ status: 'connected', latency: 2, circuit_breakers: [OPEN_HOST] });
  });

  it('adds no circuit_breakers field for a service without breakers', async () => {
    const healthCheck = new InfrastructureHealthCheckService();
    healthCheck.registerService(fakeService('cache', connected));

    const result = await healthCheck.checkHealth();

    expect(result.services.cache).toEqual({ status: 'connected', latency: 2 });
  });

  it('still adds the circuit breaker statuses when the driver check fails', async () => {
    const healthCheck = new InfrastructureHealthCheckService();
    const failing = async (): Promise<IDriverHealthStatus> => {
      throw new Error('verify failed');
    };
    healthCheck.registerService(fakeService('email', failing, [OPEN_HOST]));

    const result = await healthCheck.checkHealth();

    expect(result.services.email).toEqual({
      status: 'disconnected',
      message: 'verify failed',
      circuit_breakers: [OPEN_HOST],
    });
  });

  it('keeps the overall status healthy while a circuit breaker is open', async () => {
    const healthCheck = new InfrastructureHealthCheckService();
    healthCheck.registerService(fakeService('database_mapper', connected));
    healthCheck.registerService(fakeService('httpClient', connected, [OPEN_HOST]));

    const result = await healthCheck.checkHealth();

    expect(result.status).toBe('healthy');
  });
});
