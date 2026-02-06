/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Server } from 'socket.io';
import type { ISocket } from '@/application/interfaces/socket.interface';

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
   * Creates an instance of SocketIOService
   *
   * @param {Server} driver - The Socket.IO Server instance from the core driver
   */
  constructor(private readonly driver: Server) {}

  /**
   * Emits an event to all connected socket clients
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
   * // this.driver.to('room-name').emit(event, data);
   * ```
   */
  emitEvent(event: string, data: Record<string, unknown>): void {
    this.driver.emit(event, data);
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
    this.driver.on(event, handler);
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
    this.driver.disconnectSockets();

    // Close the server
    await new Promise<void>((resolve, reject) => {
      this.driver.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
