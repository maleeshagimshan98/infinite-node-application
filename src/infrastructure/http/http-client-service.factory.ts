/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * HTTP Client Service Factory
 *
 * Factory for creating HTTP client service instance.
 */

import type { IHTTPClient } from '@/application/interfaces/http-client.interface';

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
   * Creates an HTTP client service instance
   *
   * @returns {Promise<IHTTPClient>} An HTTP client service instance
   *
   * @example
   * ```typescript
   * const factory = new HTTPClientServiceFactory();
   * const httpClient = await factory.create();
   * ```
   */
  async create(): Promise<IHTTPClient> {
    const timeout = process.env.HTTP_CLIENT_TIMEOUT ? parseInt(process.env.HTTP_CLIENT_TIMEOUT) : 5000;
    return new HTTPClientService({ timeout });
  }
}
