/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Server } from 'socket.io';
import type { ISocket } from '@/application/interfaces/socket.interface';
import { SocketIOService } from './socketio/socketio-socket.service';

/**
 * Factory class for creating socket service instances
 *
 * @class SocketServiceFactory
 *
 * @example
 * ```typescript
 * // Using the core driver
 * const socketDriver = socketsService.service();
 * const socket = SocketServiceFactory.createSocketIOService(socketDriver);
 *
 * // Using the generic factory method
 * const socket = SocketServiceFactory.create('socketio', socketDriver);
 * ```
 */
export class SocketServiceFactory {
  /**
   * Creates a Socket.IO service instance
   *
   * @param {Server} driver - The Socket.IO Server driver instance
   * @returns {ISocket} A Socket.IO service instance
   */
  static createSocketIOService(driver: Server): ISocket {
    return new SocketIOService(driver);
  }

  /**
   * Creates a socket service instance based on the specified type
   *
   * @param {string} socketType - The type of socket provider ('socketio', 'ws', etc.)
   * @param {unknown} driver - The socket driver instance
   * @returns {ISocket} A socket service instance
   * @throws {Error} If the socket type is not supported
   *
   * @example
   * ```typescript
   * const socket = SocketServiceFactory.create('socketio', socketDriver);
   * ```
   */
  static create(socketType: string, driver: unknown): ISocket {
    switch (socketType.toLowerCase()) {
      case 'socketio':
      case 'socket.io':
        return this.createSocketIOService(driver as Server);

      // Future provider support:
      // case 'ws':
      // case 'websocket':
      //   return this.createWebSocketService(driver as WebSocketServer);
      //
      // case 'pusher':
      //   return this.createPusherService(driver as PusherClient);

      default:
        throw new Error(`Unsupported socket type: ${socketType}`);
    }
  }
}
