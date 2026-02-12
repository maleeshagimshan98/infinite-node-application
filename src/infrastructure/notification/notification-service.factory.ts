/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INotification } from '@/application/interfaces/notification.interface';

import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';
import { inMemoryNotificationDriverLoader } from './in-memory/driver/in-memory-notification.driver.loader';

/**
 * Factory class for creating notification service instances
 *
 * Provides static methods to instantiate notification services with their respective drivers.
 * The factory handles driver creation, initialization, and service instantiation.
 *
 * @class NotificationServiceFactory
 *
 * @example
 * ```typescript
 * // Create an In-Memory notification service
 * const notification = await NotificationServiceFactory.createInMemoryNotificationService();
 *
 * // Using the generic factory method
 * const notification = await NotificationServiceFactory.create('in-memory');
 * ```
 */
export class NotificationServiceFactory {
  /**
   * Creates an In-Memory notification service instance
   *
   * This method creates and initializes the InMemoryNotificationDriver,
   * then constructs and returns an InMemoryNotificationService with the initialized driver.
   *
   * @returns {Promise<INotification>} A promise that resolves to an initialized In-Memory notification service instance
   * @throws {Error} If driver initialization fails
   *
   * @example
   * ```typescript
   * const notification = await NotificationServiceFactory.createInMemoryNotificationService();
   * await notification.sendNotification('user123', { title: 'Hello', body: 'World' });
   * ```
   */
  static async createInMemoryNotificationService(): Promise<INotification> {
    return new InMemoryNotificationService(await inMemoryNotificationDriverLoader());
  }

  /**
   * Creates a notification service instance based on the specified type
   *
   * This is a generic factory method that routes to specific service creation methods
   * based on the notification type parameter.
   *
   * @param {string} notificationType - The type of notification provider ('in-memory', 'fcm', 'sns', etc.)
   * @returns {Promise<INotification>} A promise that resolves to a notification service instance
   * @throws {Error} If the notification type is not supported or if initialization fails
   *
   * @example
   * ```typescript
   * const notification = await NotificationServiceFactory.create('in-memory');
   * await notification.broadcastNotification({ title: 'System Update', body: 'Maintenance scheduled' });
   * ```
   */
  static async create(): Promise<INotification> {
    const notificationType = process.env.NOTIFICATION_DRIVER || 'inmemory';
    switch (notificationType.toLowerCase()) {
      case 'in-memory':
      case 'inmemory':
        return await this.createInMemoryNotificationService();

      // Future provider support:
      // case 'fcm':
      //   return await this.createFCMNotificationService();
      //
      // case 'sns':
      //   return await this.createSNSNotificationService();
      //
      // case 'onesignal':
      //   return await this.createOneSignalNotificationService();

      default:
        throw new Error(`Unsupported notification type: ${notificationType}`);
    }
  }
}
