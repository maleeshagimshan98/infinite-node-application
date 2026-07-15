/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import axios from 'axios';

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import type { IHTTPClient, RequestConfig } from '@/application/interfaces/http-client.interface';

import { HTTPResponse } from './http-response';

/**
 * HTTP Client service for making external API requests.
 * Uses axios under the hood and returns HTTPResponse objects.
 *
 * @class HTTPClientService
 * @implements {IHTTPClient}
 *
 * @example
 * ```typescript
 * const httpClient = new HTTPClientService({ timeout: 5000 });
 *
 * const response = await httpClient.post({
 *   url: 'https://api.example.com/users',
 *   data: { name: 'John Doe' }
 * });
 * ```
 */
export class HTTPClientService implements IHTTPClient {
  private timeout: number;

  constructor({ timeout }: { timeout?: number } = {}) {
    this.timeout = timeout ?? 5000;
  }

  /**
   * Returns the service name identifier for this infrastructure service
   *
   * @returns {'httpClient'} Service name identifier
   */
  serviceName(): 'httpClient' {
    return 'httpClient';
  }

  /**
   * Indicates that this service should be treated as a singleton within the application context
   *
   * @returns {true}
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this service should be deferred during initialization
   *
   * @returns {false}
   */
  deferred(): false {
    return false;
  }

  /**
   * Returns the underlying driver instance (axios)
   *
   * @returns {typeof axios} The axios instance
   */
  getDriver(): typeof axios {
    return axios;
  }

  /**
   * Make a GET request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   */
  public get(config: Omit<RequestConfig, 'method'>): Promise<HTTPResponse> {
    return this.createRequest({
      ...config,
      method: 'GET',
    });
  }

  /**
   * Make a POST request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError}
   */
  public post(config: Omit<RequestConfig, 'method'>): Promise<HTTPResponse> {
    return this.createRequest({
      ...config,
      method: 'POST',
    });
  }

  /**
   * Make a PUT request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError}
   */
  public put(config: Omit<RequestConfig, 'method'>): Promise<HTTPResponse> {
    return this.createRequest({
      ...config,
      method: 'PUT',
    });
  }

  /**
   * Make a PATCH request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError}
   */
  public patch(config: Omit<RequestConfig, 'method'>): Promise<HTTPResponse> {
    return this.createRequest({
      ...config,
      method: 'PATCH',
    });
  }

  /**
   * Make a DELETE request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError}
   */
  public delete(config: Omit<RequestConfig, 'method'>): Promise<HTTPResponse> {
    return this.createRequest({
      ...config,
      method: 'DELETE',
    });
  }

  /**
   * Internal method to create and execute HTTP requests
   *
   * @private
   * @param {RequestConfig} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError}
   */
  private async createRequest(config: RequestConfig): Promise<HTTPResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosConfig: any = {
      url: config.url ?? '',
      method: config.method ?? 'GET',
      headers: config.headers ?? {},
      params: config.params ?? {},
      timeout: config.timeout ?? this.timeout,
      validateStatus: () => true,
    };

    if (config.data) {
      axiosConfig.data = config.data;
    }

    const response = await axios(axiosConfig).catch((e: unknown) => {
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new InfrastructureError(
        `Network request failed: ${config.method} ${config.url} - ${errorMessage}`,
        'NETWORK_ERROR',
        {
          method: config.method,
          url: config.url,
          error: errorMessage,
        },
      );
    });

    return new HTTPResponse(response.data.status, response.data.code, response.data.message, response.data.data);
  }
}

export default HTTPClientService;
