/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import axios from 'axios';

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import type { IHTTPClient, RequestConfig } from '@/application/interfaces/http-client.interface';
import type { ICircuitBreaker } from '@/application/interfaces/circuit-breaker/circuit-breaker.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/circuit-breaker/circuit-breaker-status.interface';

import { HTTPResponse } from './http-response';

import type { AxiosResponse } from 'axios';

/**
 * Most hosts the client keeps a circuit breaker for. Past it the least recently used breaker is dropped, so
 * requests to many different hosts (e.g. webhooks) can't grow the map without limit.
 */
export const MAX_CIRCUIT_BREAKERS = 100;

export interface IHTTPClientServiceOptions {
  /** Default request timeout in milliseconds */
  timeout?: number;
  /** Creates the circuit breaker for a host, given its origin (e.g. 'https://api.example.com') */
  createCircuitBreaker: (origin: string) => ICircuitBreaker;
}

/**
 * Determine whether a response means the host is failing or throttling, rather than rejecting this request:
 * any 5xx, 408 Request Timeout or 429 Too Many Requests.
 *
 * @param {AxiosResponse} response - The response received.
 * @returns {boolean} True when the response counts towards opening the host's circuit.
 */
function isTransientFailureResponse(response: AxiosResponse): boolean {
  return response.status >= 500 || response.status === 408 || response.status === 429;
}

/**
 * HTTP Client service for making external API requests.
 * Uses axios under the hood and returns HTTPResponse objects.
 *
 * Every host gets its own circuit breaker: once a host keeps failing (network errors, or 5xx / 408 / 429
 * responses), requests to it are rejected with CircuitOpenError without being sent, while other hosts are
 * unaffected.
 *
 * @class HTTPClientService
 * @implements {IHTTPClient}
 *
 * @example
 * ```typescript
 * const httpClient = new HTTPClientService({
 *   timeout: 5000,
 *   createCircuitBreaker: (origin) => new CircuitBreaker({ name: origin, failureThreshold: 5, resetTimeout: 30000 }),
 * });
 *
 * const response = await httpClient.post({
 *   url: 'https://api.example.com/users',
 *   data: { name: 'John Doe' }
 * });
 * ```
 */
export class HTTPClientService implements IHTTPClient {
  private timeout: number;
  private readonly createCircuitBreaker: (origin: string) => ICircuitBreaker;
  private readonly circuitBreakers = new Map<string, ICircuitBreaker>();

  constructor({ timeout, createCircuitBreaker }: IHTTPClientServiceOptions) {
    this.timeout = timeout ?? 5000;
    this.createCircuitBreaker = createCircuitBreaker;
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
   * Report the hosts whose circuit is not closed, for the health check. Closed ones are left out so a client
   * talking to many healthy hosts doesn't fill the health response and the logs.
   *
   * @returns {ICircuitBreakerStatus[]} The open and half-open hosts' breaker statuses; empty when all are closed
   */
  circuitBreakerStatuses(): ICircuitBreakerStatus[] {
    return [...this.circuitBreakers.values()]
      .filter((circuitBreaker) => circuitBreaker.state !== 'closed')
      .map((circuitBreaker) => circuitBreaker.circuitBreakerStatus());
  }

  /**
   * Make a GET request
   *
   * @param {Omit<RequestConfig, 'method'>} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed
   * @throws {CircuitOpenError} CONNECTION_ERROR when the host's circuit is open; the request was not sent
   * @throws {Error} When the request could not be set up (caller or configuration error)
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
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed
   * @throws {CircuitOpenError} CONNECTION_ERROR when the host's circuit is open; the request was not sent
   * @throws {Error} When the request could not be set up (caller or configuration error)
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
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed
   * @throws {CircuitOpenError} CONNECTION_ERROR when the host's circuit is open; the request was not sent
   * @throws {Error} When the request could not be set up (caller or configuration error)
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
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed
   * @throws {CircuitOpenError} CONNECTION_ERROR when the host's circuit is open; the request was not sent
   * @throws {Error} When the request could not be set up (caller or configuration error)
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
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed
   * @throws {CircuitOpenError} CONNECTION_ERROR when the host's circuit is open; the request was not sent
   * @throws {Error} When the request could not be set up (caller or configuration error)
   */
  public delete(config: Omit<RequestConfig, 'method'>): Promise<HTTPResponse> {
    return this.createRequest({
      ...config,
      method: 'DELETE',
    });
  }

  /**
   * Internal method to create and execute HTTP requests. Only failures after the request was sent
   * (connection, DNS, timeout, redirects, unreadable response) are infrastructure errors; failures while
   * setting the request up (unsupported protocol, invalid URL, unserializable body) are rethrown unchanged.
   *
   * @private
   * @param {RequestConfig} config - Request configuration
   * @returns {Promise<HTTPResponse>}
   * @throws {InfrastructureError} NETWORK_ERROR when the request was sent but failed
   * @throws {CircuitOpenError} CONNECTION_ERROR when the host's circuit is open; the request was not sent
   * @throws {Error} When the request could not be set up (caller or configuration error)
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

    const send = (): Promise<AxiosResponse> =>
      axios(axiosConfig).catch((e: unknown) => {
        // axios sets `request` only once the request was actually sent.
        if (!axios.isAxiosError(e) || e.request === undefined) {
          throw e;
        }
        // The AxiosError itself is deliberately not attached: its `config` carries request headers (API keys,
        // Authorization) that would end up in the logs.
        throw new InfrastructureError(
          `Network request failed: ${config.method} ${config.url} - ${e.message}`,
          'NETWORK_ERROR',
          {
            method: config.method,
            url: config.url,
            code: e.code,
            error: e.message,
          },
        );
      });

    const circuitBreaker = this.circuitBreakerFor(config.url);
    // A URL that can't be parsed has no host to guard; axios rejects it as a set-up error, unchanged.
    const response = circuitBreaker ? await circuitBreaker.execute(send, isTransientFailureResponse) : await send();

    return new HTTPResponse(response.statusText, response.status, response.data.message, response.data);
  }

  /**
   * Get the circuit breaker for a URL's host, creating it on first use. Only the MAX_CIRCUIT_BREAKERS most
   * recently used hosts keep theirs.
   *
   * @private
   * @param {string} url - The request URL.
   * @returns {ICircuitBreaker | undefined} The host's breaker, or undefined when the URL can't be parsed.
   */
  private circuitBreakerFor(url: string): ICircuitBreaker | undefined {
    if (!URL.canParse(url)) {
      return undefined;
    }
    const { origin } = new URL(url);
    const circuitBreaker = this.circuitBreakers.get(origin) ?? this.createCircuitBreaker(origin);
    // Re-inserting moves the host to the end of the Map's insertion order, so its first key is always the least
    // recently used one.
    this.circuitBreakers.delete(origin);
    this.circuitBreakers.set(origin, circuitBreaker);
    if (this.circuitBreakers.size > MAX_CIRCUIT_BREAKERS) {
      const leastRecentlyUsed = this.circuitBreakers.keys().next().value;
      if (leastRecentlyUsed !== undefined) {
        this.circuitBreakers.delete(leastRecentlyUsed);
      }
    }
    return circuitBreaker;
  }
}

export default HTTPClientService;
