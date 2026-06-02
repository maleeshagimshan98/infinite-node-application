/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { APIResponse } from '@/app/core/utils/api-response/api-response';

import type { IBaseInfrastructureService } from './base.interface';

export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: Record<string, unknown>;
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
   * @returns {Promise<APIResponse>}
   */
  get(config: Omit<RequestConfig, 'method'>): Promise<APIResponse>;

  /**
   * Make a POST request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<APIResponse>}
   * @throws {InfrastructureError}
   */
  post(config: Omit<RequestConfig, 'method'>): Promise<APIResponse>;

  /**
   * Make a PUT request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<APIResponse>}
   * @throws {InfrastructureError}
   */
  put(config: Omit<RequestConfig, 'method'>): Promise<APIResponse>;

  /**
   * Make a PATCH request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<APIResponse>}
   * @throws {InfrastructureError}
   */
  patch(config: Omit<RequestConfig, 'method'>): Promise<APIResponse>;

  /**
   * Make a DELETE request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<APIResponse>}
   * @throws {InfrastructureError}
   */
  delete(config: Omit<RequestConfig, 'method'>): Promise<APIResponse>;
}
