/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ISocket } from '@/application/interfaces/socket.interface';

import type { SocketsDriver } from './driver/sockets.driver';
import type { Server } from 'socket.io';

/**
 * Socket.IO Socket Service Implementation
 *
 * Provides real-time socket communication using Socket.IO.
 * Supports emitting events, listening to events, and managing connections.
 *
 * @class SocketIOService
 * @implements {ISocket}
 *
 * @example
 * ```typescript
 * const socketDriver = socketsService.service(); // Socket.IO Server instance
 * const socketService = new SocketIOService(socketDriver);
 *
 * // Emit an event to all connected clients
 * socketService.emitEvent('notification', { message: 'Hello World' });
 *
 * // Listen to events from clients
 * socketService.onEvent('message', (data) => {
 *   console.log('Received message:', data);
 * });
 *
 * // Disconnect all clients
 * await socketService.disconnect();
 * ```
 */
export class SocketIOService implements ISocket {
  /**
   * The SocketsDriver instance
   *
   * @type {SocketsDriver}
   */
  private driver: SocketsDriver;

  /**
   * The Socket.IO Server client instance used for emitting and listening to events
   *
   * @type {Server}
   */
  private client: Server;

  /**
   * Creates an instance of SocketIOService
   *
   * @param {SocketsDriver} driver - The Socket.IO Server instance from the core driver
   */
  constructor(driver: SocketsDriver) {
    this.driver = driver;
    const client = driver.client();
    if (!client || !(client instanceof Object)) {
      throw new Error('Invalid Socket.IO client provided to SocketIOService');
    }
    this.client = client;
  }

  /**
   * Get the service name for this socket implementation
   *
   * @returns {'socket'} The service name identifier
   */
  serviceName(): 'socket' {
    return 'socket';
  }

  /**
   * Indicates that this socket service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this socket service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  /**
   * Returns the underlying SocketsDriver instance
   *
   * @returns {SocketsDriver} The SocketsDriver instance
   */
  getDriver(): SocketsDriver {
    return this.driver;
  }

  /**
   * Emits an event to all connected clients
   *
   * @param {string} event - The event name to emit
   * @param {Record<string, unknown>} data - The data payload to send with the event
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Emit a simple notification
   * socketService.emitEvent('notification', { type: 'info', message: 'System update available' });
   *
   * // Emit user-specific data
   * socketService.emitEvent('user-update', { userId: '123', status: 'online' });
   *
   * // Emit to a specific room (if needed, extend this method)
   * // this.client?.to('room-name').emit(event, data);
   * ```
   */
  emitEvent(event: string, data: Record<string, unknown>): void {
    this.client.emit(event, data);
  }

  /**
   * Registers an event listener for incoming socket events
   *
   * @param {string} event - The event name to listen for
   * @param {(data: Record<string, unknown>) => void} handler - The callback function to handle the event
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Listen for chat messages
   * socketService.onEvent('chat-message', (data) => {
   *   console.log('New message:', data.text, 'from', data.userId);
   *   // Save message to database
   * });
   *
   * // Listen for connection events
   * socketService.onEvent('connection', (socket) => {
   *   console.log('Client connected:', socket.id);
   * });
   * ```
   */
  onEvent(event: string, handler: (data: Record<string, unknown>) => void): void {
    this.client.on(event, handler);
  }

  /**
   * Disconnects all socket clients and closes the server
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * await socketService.disconnect();
   * console.log('All socket connections closed');
   * ```
   */
  async disconnect(): Promise<void> {
    // Disconnect all connected clients
    this.client.disconnectSockets();

    // Close the server
    await new Promise<void>((resolve, reject) => {
      this.client.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Gracefully shutdown Socket.IO server
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    console.log('  Closing Socket.IO connections...');
    await this.disconnect();
  }
}
