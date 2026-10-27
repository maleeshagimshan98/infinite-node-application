/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import http from 'http';

import axios from 'axios';

import { CircuitBreaker } from '@/infrastructure/core/core.circuit-breaker';
import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import type { ICircuitBreaker } from '@/application/interfaces/circuit-breaker/circuit-breaker.interface';

import { HTTPClientService, MAX_CIRCUIT_BREAKERS } from './http-client.service';

interface TestServer {
  origin: string;
  close: () => Promise<void>;
}

/**
 * Start a local server: `/status/<code>` answers with that status, `/reset` drops the connection unanswered.
 *
 * @returns {Promise<TestServer>} The server's origin and a function to stop it.
 */
async function startServer(): Promise<TestServer> {
  const server = http.createServer((req, res) => {
    if (req.url === '/reset') {
      req.socket.destroy();
      return;
    }
    const code = Number(req.url?.split('/')[2]) || 200;
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: `status ${code}` }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Test server is not listening on a TCP port');
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async (): Promise<void> => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/**
 * Create the client with breakers that open on the first counted failure.
 *
 * @returns {{ client: HTTPClientService; createCircuitBreaker: jest.Mock<ICircuitBreaker, [string]> }} The client
 * and the breaker factory it was given.
 */
function createClient(): { client: HTTPClientService; createCircuitBreaker: jest.Mock<ICircuitBreaker, [string]> } {
  const createCircuitBreaker = jest.fn(
    (origin: string): ICircuitBreaker => new CircuitBreaker({ name: origin, failureThreshold: 0, resetTimeout: 60000 }),
  );
  return { client: new HTTPClientService({ timeout: 5000, createCircuitBreaker }), createCircuitBreaker };
}

describe('HTTPClientService error classification', () => {
  it('rethrows a request set-up failure unchanged', async () => {
    const { client } = createClient();

    const thrown = await client.get({ url: 'ftp://localhost/x' }).catch((e: unknown) => e);

    expect(axios.isAxiosError(thrown)).toBe(true);
    expect(thrown).not.toBeInstanceOf(InfrastructureError);
  });

  it('wraps a failure after the request was sent in a NETWORK_ERROR without leaking request headers', async () => {
    const { client } = createClient();

    const thrown = await client
      .get({ url: 'http://127.0.0.1:1/', headers: { Authorization: 'Bearer top-secret' } })
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'NETWORK_ERROR', data: { code: 'ECONNREFUSED' } });
    expect(JSON.stringify(thrown instanceof InfrastructureError ? thrown.data : null)).not.toContain('top-secret');
  }, 15000);
});

describe('HTTPClientService circuit breakers', () => {
  let serverA: TestServer;
  let serverB: TestServer;

  beforeAll(async () => {
    serverA = await startServer();
    serverB = await startServer();
  });

  afterAll(async () => {
    await serverA.close();
    await serverB.close();
  });

  it('stops sending to a host once a network failure opens its circuit', async () => {
    const { client } = createClient();

    await expect(client.get({ url: `${serverA.origin}/reset` })).rejects.toMatchObject({ type: 'NETWORK_ERROR' });
    await expect(client.get({ url: `${serverA.origin}/status/200` })).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('keeps a separate circuit for each host', async () => {
    const { client } = createClient();
    await client.get({ url: `${serverA.origin}/reset` }).catch(() => undefined);

    const response = await client.get({ url: `${serverB.origin}/status/200` });

    expect(response.getCode()).toBe(200);
  });

  it.each([500, 503, 408, 429])(
    'counts a %i response but still returns it, then rejects the next request',
    async (code) => {
      const { client } = createClient();

      const response = await client.get({ url: `${serverA.origin}/status/${code}` });
      expect(response.getCode()).toBe(code);

      await expect(client.get({ url: `${serverA.origin}/status/200` })).rejects.toBeInstanceOf(CircuitOpenError);
    },
  );

  it.each([400, 404])('does not count a %i response', async (code) => {
    const { client } = createClient();

    await client.get({ url: `${serverA.origin}/status/${code}` });
    const response = await client.get({ url: `${serverA.origin}/status/${code}` });

    expect(response.getCode()).toBe(code);
  });

  it('creates one breaker per host and reuses it', async () => {
    const { client, createCircuitBreaker } = createClient();

    await client.get({ url: `${serverA.origin}/status/200` });
    await client.get({ url: `${serverA.origin}/status/201` });

    expect(createCircuitBreaker).toHaveBeenCalledTimes(1);
    expect(createCircuitBreaker).toHaveBeenCalledWith(serverA.origin);
  });

  it('drops the least recently used breaker once more than MAX_CIRCUIT_BREAKERS hosts are in use', async () => {
    const { client, createCircuitBreaker } = createClient();
    // ftp URLs parse (so each gets a breaker) but axios rejects them before sending anything.
    const requestTo = (host: number): Promise<unknown> =>
      client.get({ url: `ftp://host-${host}/` }).catch((e: unknown) => e);

    for (let host = 0; host <= MAX_CIRCUIT_BREAKERS; host++) {
      await requestTo(host);
    }
    expect(createCircuitBreaker).toHaveBeenCalledTimes(MAX_CIRCUIT_BREAKERS + 1);

    await requestTo(1);
    expect(createCircuitBreaker).toHaveBeenCalledTimes(MAX_CIRCUIT_BREAKERS + 1);

    await requestTo(0);
    expect(createCircuitBreaker).toHaveBeenCalledTimes(MAX_CIRCUIT_BREAKERS + 2);
    expect(createCircuitBreaker).toHaveBeenLastCalledWith('ftp://host-0');

    // host-1 was used more recently than host-2, so host-0's breaker evicted host-2 and host-1 kept its own.
    await requestTo(1);
    expect(createCircuitBreaker).toHaveBeenCalledTimes(MAX_CIRCUIT_BREAKERS + 2);
  });

  it('sends a request whose URL cannot be parsed without a breaker, rethrowing the set-up error', async () => {
    const { client, createCircuitBreaker } = createClient();

    const thrown = await client.get({ url: 'not a url' }).catch((e: unknown) => e);

    expect(thrown).not.toBeInstanceOf(InfrastructureError);
    expect(createCircuitBreaker).not.toHaveBeenCalled();
  });

  it('reports no circuit breakers for the health check while every host is closed', async () => {
    const { client } = createClient();

    await client.get({ url: `${serverA.origin}/status/200` });

    expect(client.circuitBreakerStatuses()).toEqual([]);
  });

  it('reports only the hosts whose circuit is not closed, named by their origin', async () => {
    const { client } = createClient();
    await client.get({ url: `${serverA.origin}/reset` }).catch(() => undefined);
    await client.get({ url: `${serverB.origin}/status/200` });

    expect(client.circuitBreakerStatuses()).toEqual([
      { name: serverA.origin, state: 'open', failureCount: 1, failureThreshold: 0 },
    ]);
  });
});
