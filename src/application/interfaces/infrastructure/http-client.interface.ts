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
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'httpClient'} Always `httpClient`.
   */
  serviceName(): 'httpClient';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;

  /**
   * Make a GET request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>} The response, whatever its status: a non-2xx response does not throw.
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed (DNS, refused, timeout,
   * redirects, unreadable response).
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the host's circuit is open; the
   * request was not sent.
   * @throws {Error} when the request cannot be set up (invalid URL, unserializable body).
   */
  get(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a POST request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>} The response, whatever its status: a non-2xx response does not throw.
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed (DNS, refused, timeout,
   * redirects, unreadable response).
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the host's circuit is open; the
   * request was not sent.
   * @throws {Error} when the request cannot be set up (invalid URL, unserializable body).
   */
  post(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a PUT request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>} The response, whatever its status: a non-2xx response does not throw.
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed (DNS, refused, timeout,
   * redirects, unreadable response).
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the host's circuit is open; the
   * request was not sent.
   * @throws {Error} when the request cannot be set up (invalid URL, unserializable body).
   */
  put(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a PATCH request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>} The response, whatever its status: a non-2xx response does not throw.
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed (DNS, refused, timeout,
   * redirects, unreadable response).
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the host's circuit is open; the
   * request was not sent.
   * @throws {Error} when the request cannot be set up (invalid URL, unserializable body).
   */
  patch(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;

  /**
   * Make a DELETE request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<IHTTPResponse>} The response, whatever its status: a non-2xx response does not throw.
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed (DNS, refused, timeout,
   * redirects, unreadable response).
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the host's circuit is open; the
   * request was not sent.
   * @throws {Error} when the request cannot be set up (invalid URL, unserializable body).
   */
  delete(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
}
