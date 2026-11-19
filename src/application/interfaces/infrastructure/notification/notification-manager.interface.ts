/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

import type { INewNotification } from './notification.interface';

export interface INotificationManager extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'notification'} Always `notification`.
   */
  serviceName(): 'notification';
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
   * Send a notification to a specific recipient
   *
   * @param {string} to - Recipient identifier (user ID, device token, phone number, etc.)
   * @param {Record<string, unknown>} message - Notification message
   * @returns {Promise<void>} resolving when notification is sent
   * @throws {TypeError} when the message cannot be serialized for the provider; nothing is sent.
   * @throws {InfrastructureError} NOTIFICATION_ERROR when the provider cannot be reached or refuses the
   * notification.
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the provider's circuit is open and
   * the notification was not attempted.
   */
  sendNotification(to: string, message: Record<string, unknown>): Promise<void>;

  /**
   * Broadcast a notification to all connected users/devices
   *
   * @param {Record<string, unknown>} message - Notification message to broadcast
   * @returns {Promise<void>} resolving when broadcast is complete
   * @throws {TypeError} when the message cannot be serialized for the provider; nothing is sent.
   * @throws {InfrastructureError} NOTIFICATION_ERROR when no broadcast target is configured, or the provider
   * cannot be reached or refuses the notification.
   * @throws {InfrastructureError} CONNECTION_ERROR (a CircuitOpenError) when the provider's circuit is open and
   * the notification was not attempted.
   */
  broadcastNotification(message: Record<string, unknown>): Promise<void>;

  /**
   * Queue a notification to be logged and sent
   *
   * @param {INewNotification} notification - The notification to send; the service sets its id, status and provider
   * @returns {Promise<void>} resolving once the notification is queued
   * @throws {InfrastructureError} NOTIFICATION_ERROR always, until the notification manager exists.
   */
  enqueueNotification(notification: INewNotification): Promise<void>;
}
