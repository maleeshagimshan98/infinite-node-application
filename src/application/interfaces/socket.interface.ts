/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from './base.interface';

export interface ISocket extends IBaseInfrastructureService {
  serviceName(): 'socket';
  singleton(): true;
  deferred(): false;
  /**
   * Emit an event to connected clients
   *
   * @param event - Event name
   * @param data - Event data/payload
   * @returns {void}
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
   */
  disconnect(): void;
}
