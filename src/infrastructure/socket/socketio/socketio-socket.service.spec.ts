/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { createServer } from 'http';

import { Server } from 'socket.io';

import { SocketError } from '@/infrastructure/socket/errors/socket.error';

import { SocketsDriver } from './driver/sockets.driver';
import { socketConfig } from './driver/socket.config';
import { SocketIOService } from './socketio-socket.service';

// Never attached to an HTTP server, so it opens no handles and needs no cleanup.
const io = new Server();

class StubSocketsDriver extends SocketsDriver {
  override client(): Server {
    return io;
  }
}

describe('SocketIOService.emitEvent', () => {
  const service = new SocketIOService(new StubSocketsDriver(socketConfig(), createServer()));

  it('lets a reserved event name error propagate unchanged instead of wrapping it in a SocketError', () => {
    let thrown: unknown;
    try {
      service.emitEvent('connect', {});
    } catch (e: unknown) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(SocketError);
    expect(thrown).toHaveProperty('message', '"connect" is a reserved event name');
  });
});
