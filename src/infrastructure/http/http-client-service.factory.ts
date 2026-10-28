/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * HTTP Client Service Factory
 *
 * Factory for creating HTTP client service instance.
 */

import type { IHTTPClient } from '@/application/interfaces/infrastructure/http-client.interface';
import { CircuitBreaker } from '@/infrastructure/core/core.circuit-breaker';
import type { ICircuitBreaker } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';

import { HTTPClientService } from './http-client.service';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

/**
 * Factory class for creating HTTP client service instance
 *
 * @class HTTPClientServiceFactory
 *
 * @example
 * ```typescript
 * const factory = new HTTPClientServiceFactory();
 * const httpClient = await factory.create();
 * ```
 */
export class HTTPClientServiceFactory implements IServiceFactory<IHTTPClient> {
  /**
   * Creates an HTTP client service instance that guards each host with its own circuit breaker
   *
   * @returns {Promise<IHTTPClient>} An HTTP client service instance
   * @throws {RangeError} If the configured circuit breaker threshold or reset timeout is invalid
   *
   * @example
   * ```typescript
   * const factory = new HTTPClientServiceFactory();
   * const httpClient = await factory.create();
   * ```
   */
  async create(): Promise<IHTTPClient> {
    const timeout = process.env.HTTP_CLIENT_TIMEOUT ? parseInt(process.env.HTTP_CLIENT_TIMEOUT) : 5000;
    // Not `Number(...) || 5`: that would turn an explicit 0 (open on the first failure) into 5.
    const failureThreshold = process.env.HTTP_CLIENT_CIRCUIT_FAILURE_THRESHOLD
      ? Number(process.env.HTTP_CLIENT_CIRCUIT_FAILURE_THRESHOLD)
      : 5;
    const resetTimeout = Number(process.env.HTTP_CLIENT_CIRCUIT_RESET_TIMEOUT) || 30000;
    const createCircuitBreaker = (origin: string): ICircuitBreaker =>
      new CircuitBreaker({ name: `http ${origin}`, failureThreshold, resetTimeout });

    // Breakers are created on each host's first request; build one now so invalid options fail at startup instead.
    createCircuitBreaker('startup-check');

    return new HTTPClientService({ timeout, createCircuitBreaker });
  }
}
