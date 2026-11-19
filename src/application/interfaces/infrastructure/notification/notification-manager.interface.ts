/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

import type { INewNotification } from './notification.interface';

export interface INotificationManager extends IBaseInfrastructureService {
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

  /**
   * Queue a notification to be logged and sent
   *
   * @param {INewNotification} notification - The notification to send; the service sets its id, status and provider
   * @returns {Promise<void>} resolving once the notification is queued
   */
  enqueueNotification(notification: INewNotification): Promise<void>;
}
