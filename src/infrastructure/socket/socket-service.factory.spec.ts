/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { SocketServiceFactory } from './socket-service.factory';

describe('SocketServiceFactory', () => {
  const originalDriver = process.env.SOCKET_DRIVER;

  afterEach(() => {
    if (originalDriver === undefined) {
      delete process.env.SOCKET_DRIVER;
    } else {
      process.env.SOCKET_DRIVER = originalDriver;
    }
  });

  it('is registered as socket', () => {
    expect(new SocketServiceFactory().name()).toBe('socket');
  });

  it('rejects an unsupported SOCKET_DRIVER with DRIVER_ERROR', async () => {
    process.env.SOCKET_DRIVER = 'ws';

    const thrown = await new SocketServiceFactory().create().catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'DRIVER_ERROR', data: { socketType: 'ws' } });
  });
});
