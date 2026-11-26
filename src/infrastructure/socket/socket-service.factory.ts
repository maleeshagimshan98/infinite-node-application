/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ISocket } from '@/application/interfaces/infrastructure/socket.interface';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { SocketIOService } from './socketio/socketio-socket.service';
import { socketDriverLoader } from './socketio/driver/socket-driver.loader';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

/**
 * Factory class for creating socket service instances
 *
 * @class SocketServiceFactory
 *
 * @example
 * ```typescript
 * const factory = new SocketServiceFactory();
 * const socket = await factory.create();
 * ```
 */
export class SocketServiceFactory implements IServiceFactory<ISocket> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'socket'} Service registration name
   */
  name(): 'socket' {
    return 'socket';
  }

  /**
   * Creates a Socket.IO service instance
   *
   * @returns {Promise<ISocket>} A Socket.IO service instance
   * @throws {Error} when no `httpServer` is registered in the container.
   */
  async createSocketIOService(): Promise<ISocket> {
    return new SocketIOService(await socketDriverLoader());
  }

  /**
   * Creates a socket service instance based on the configured socket driver type
   *
   * @returns {Promise<ISocket>} A socket service instance
   * @throws {InfrastructureError} DRIVER_ERROR if the socket driver is not supported
   *
   * @example
   * ```typescript
   * const factory = new SocketServiceFactory();
   * const socket = await factory.create();
   * ```
   */
  async create(): Promise<ISocket> {
    const socketType = process.env.SOCKET_DRIVER || 'socketio';
    switch (socketType.toLowerCase()) {
      case 'socketio':
      case 'socket.io':
        return this.createSocketIOService();

      // Future provider support:
      // case 'ws':
      // case 'websocket':
      //   return this.createWebSocketService(driver as WebSocketServer);
      //
      // case 'pusher':
      //   return this.createPusherService(driver as PusherClient);

      default:
        throw new InfrastructureError(`Unsupported socket type: ${socketType}`, 'DRIVER_ERROR', {
          socketType,
        });
    }
  }
}
