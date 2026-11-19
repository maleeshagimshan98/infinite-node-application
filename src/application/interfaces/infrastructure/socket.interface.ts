/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface ISocket extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'socket'} Always `socket`.
   */
  serviceName(): 'socket';
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
   * Emit an event to connected clients
   *
   * @param {string} event - Event name
   * @param {Record<string, unknown>} data - Event data/payload
   * @returns {void}
   * @throws {Error} when `event` is a reserved event name or `data` cannot be serialized.
   */
  emitEvent(event: string, data: Record<string, unknown>): void;

  /**
   * Register a handler for incoming events
   *
   * @param {string} event - Event name to listen for
   * @param {(data: Record<string, unknown>) => void} handler - Handler function to process the event
   * @returns {void}
   */
  onEvent(event: string, handler: (data: Record<string, unknown>) => void): void;

  /**
   * Disconnect from the socket server/clients
   *
   * @returns {void}
   * @throws {InfrastructureError} SOCKET_ERROR when the server cannot be closed.
   */
  disconnect(): void;
}
