/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INotification } from '@/application/interfaces/notification.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import type { InMemoryNotificationDriver } from './driver/in-memory-notification.driver';

/**
 * In-Memory Notification Service Implementation
 *
 * Provides notification functionality using an in-memory notification bus.
 * This implementation serves as a placeholder and should be replaced with real providers in production.
 *
 * @class InMemoryNotificationService
 * @implements {INotification}
 *
 * @example
 * ```typescript
 * const driver = new InMemoryNotificationDriver();
 * await driver.init(config);
 * const notificationService = new InMemoryNotificationService(driver);
 *
 * await notificationService.sendNotification('user123', { title: 'Hello', body: 'World' });
 * await notificationService.broadcastNotification({ title: 'Announcement', body: 'System maintenance' });
 * ```
 */
export class InMemoryNotificationService implements INotification {
  /**
   * The notification driver instance
   * @private
   * @readonly
   */
  private readonly driver: InMemoryNotificationDriver;

  /**
   * Creates an instance of InMemoryNotificationService
   *
   * @param {InMemoryNotificationDriver} driver - The initialized notification driver
   *
   * @example
   * ```typescript
   * const driver = new InMemoryNotificationDriver();
   * await driver.init(config);
   * const service = new InMemoryNotificationService(driver);
   * ```
   */
  constructor(driver: InMemoryNotificationDriver) {
    this.driver = driver;
  }

  /**
   * Get the service name for this notification implementation
   *
   * @returns {'notification'} The service name identifier
   */
  serviceName(): 'notification' {
    return 'notification';
  }

  /**
   * Indicates that this notification service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this notification service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  /**
   * Returns the underlying notification driver instance
   *
   * @returns {unknown} The notification driver
   *
   * @example
   * ```typescript
   * const driver = service.getDriver();
   * ```
   */
  getDriver(): unknown {
    return this.driver.client();
  }

  /**
   * Sends a notification to a specific recipient
   *
   * @param {string} to - The recipient identifier (e.g., user ID, device token, email)
   * @param {Record<string, unknown>} message - The notification message payload
   * @returns {Promise<void>}
   * @throws {InfrastructureError} NOTIFICATION_ERROR if the notification cannot be sent
   *
   * @example
   * ```typescript
   * await notificationService.sendNotification('user123', {
   *   title: 'New Message',
   *   body: 'You have a new message from Alice',
   *   data: { messageId: '456' }
   * });
   * ```
   */
  async sendNotification(to: string, message: Record<string, unknown>): Promise<void> {
    try {
      // Placeholder implementation - log to console
      console.log(`[In-Memory Notification] Sending to ${to}:`, message);

      // TODO: Replace with actual notification provider (FCM, SNS, etc.)
      // Example:
      // await this.driver.send({ to, notification: message });
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to send notification to "${to}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'NOTIFICATION_ERROR',
        { to },
      );
    }
  }

  /**
   * Broadcasts a notification to all recipients
   *
   * @param {Record<string, unknown>} message - The notification message payload
   * @returns {Promise<void>}
   * @throws {InfrastructureError} NOTIFICATION_ERROR if the broadcast cannot be sent
   *
   * @example
   * ```typescript
   * await notificationService.broadcastNotification({
   *   title: 'System Announcement',
   *   body: 'Scheduled maintenance tonight at 10 PM',
   *   priority: 'high'
   * });
   * ```
   */
  async broadcastNotification(message: Record<string, unknown>): Promise<void> {
    try {
      // Placeholder implementation - log to console
      console.log('[In-Memory Notification] Broadcasting:', message);

      // TODO: Replace with actual broadcast implementation
      // Example:
      // await this.driver.broadcast({ notification: message });
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to broadcast notification: ${e instanceof Error ? e.message : 'Unknown error'}`,
        'NOTIFICATION_ERROR',
      );
    }
  }
}
