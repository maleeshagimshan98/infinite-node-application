/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from './base-infrastructure-service.interface';

export interface INotification extends IBaseInfrastructureService {
  serviceName(): 'notification';
  singleton(): true;
  deferred(): false;

  /**
   * Send a notification to a specific recipient
   *
   * @param {string} to - Recipient identifier (user ID, device token, phone number, etc.)
   * @param {Record<string, unknown>} message - Notification message
   * @returns {Promise<void>} resolving when notification is sent
   */
  sendNotification(to: string, message: Record<string, unknown>): Promise<void>;

  /**
   * Broadcast a notification to all connected users/devices
   *
   * @param {Record<string, unknown>} message - Notification message to broadcast
   * @returns {Promise<void>} resolving when broadcast is complete
   */
  broadcastNotification(message: Record<string, unknown>): Promise<void>;
}
