/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import axios from 'axios';

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { HTTPClientService } from './http-client.service';

describe('HTTPClientService error classification', () => {
  const service = new HTTPClientService({ timeout: 5000 });

  it('rethrows a request set-up failure unchanged', async () => {
    const thrown = await service.get({ url: 'ftp://localhost/x' }).catch((e: unknown) => e);

    expect(axios.isAxiosError(thrown)).toBe(true);
    expect(thrown).not.toBeInstanceOf(InfrastructureError);
  });

  it('wraps a failure after the request was sent in a NETWORK_ERROR without leaking request headers', async () => {
    const thrown = await service
      .get({ url: 'http://127.0.0.1:1/', headers: { Authorization: 'Bearer top-secret' } })
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'NETWORK_ERROR', data: { code: 'ECONNREFUSED' } });
    expect(JSON.stringify(thrown instanceof InfrastructureError ? thrown.data : null)).not.toContain('top-secret');
  }, 15000);
});
