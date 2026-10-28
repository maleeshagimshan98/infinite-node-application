/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IHTTPResponse } from '@/application/interfaces/infrastructure/http-response.interface';
import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: Record<string, unknown> | Record<string, unknown>[] | undefined;
  timeout?: number;
};

export interface IHTTPClient extends IBaseInfrastructureService {
  serviceName(): 'httpClient';
  singleton(): true;
  deferred(): false;

  /**
   * Make a GET request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>}
   */
  get(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a POST request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>}
   * @throws {InfrastructureError}
   */
  post(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a PUT request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>}
   * @throws {InfrastructureError}
   */
  put(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a PATCH request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>}
   * @throws {InfrastructureError}
   */
  patch(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a DELETE request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>}
   * @throws {InfrastructureError}
   */
  delete(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
}
