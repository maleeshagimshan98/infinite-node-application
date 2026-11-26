/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface IPushNotificationService extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'pushNotification'} Always `pushNotification`.
   */
  serviceName(): 'pushNotification';
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
}
