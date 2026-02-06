/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INotification } from '@/application/interfaces/notification.interface';

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
 * const notificationDriver = notificationService.service(); // undefined placeholder
 * const notificationService = new InMemoryNotificationService(notificationDriver);
 *
 * await notificationService.sendNotification('user123', { title: 'Hello', body: 'World' });
 * await notificationService.broadcastNotification({ title: 'Announcement', body: 'System maintenance' });
 * ```
 */
export class InMemoryNotificationService implements INotification {
  /**
   * Creates an instance of InMemoryNotificationService
   *
   * @param {undefined} driver - The notification driver (placeholder - currently undefined)
   */
  constructor(private readonly driver: undefined) {}

  /**
   * Sends a notification to a specific recipient
   *
   * @param {string} to - The recipient identifier (e.g., user ID, device token, email)
   * @param {Record<string, unknown>} message - The notification message payload
   * @returns {Promise<void>}
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
    // Placeholder implementation - log to console
    console.log(`[In-Memory Notification] Sending to ${to}:`, message);

    // TODO: Replace with actual notification provider (FCM, SNS, etc.)
    // Example:
    // await this.driver.send({ to, notification: message });
  }

  /**
   * Broadcasts a notification to all recipients
   *
   * @param {Record<string, unknown>} message - The notification message payload
   * @returns {Promise<void>}
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
    // Placeholder implementation - log to console
    console.log('[In-Memory Notification] Broadcasting:', message);

    // TODO: Replace with actual broadcast implementation
    // Example:
    // await this.driver.broadcast({ notification: message });
  }
}
