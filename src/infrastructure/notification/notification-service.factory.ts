/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INotification } from '../../application/interfaces/notification.interface';
import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';

/**
 * Factory class for creating notification service instances
 *
 * @class NotificationServiceFactory
 *
 * @example
 * ```typescript
 * // Using the core driver
 * const notificationDriver = notificationService.service();
 * const notification = NotificationServiceFactory.createInMemoryNotificationService(notificationDriver);
 *
 * // Using the generic factory method
 * const notification = NotificationServiceFactory.create('in-memory', notificationDriver);
 * ```
 */
export class NotificationServiceFactory {
  /**
   * Creates an In-Memory notification service instance
   *
   * @param {undefined} driver - The notification driver (placeholder)
   * @returns {INotification} An In-Memory notification service instance
   */
  static createInMemoryNotificationService(driver: undefined): INotification {
    return new InMemoryNotificationService(driver);
  }

  /**
   * Creates a notification service instance based on the specified type
   *
   * @param {string} notificationType - The type of notification provider ('in-memory', 'fcm', 'sns', etc.)
   * @param {unknown} driver - The notification driver instance
   * @returns {INotification} A notification service instance
   * @throws {Error} If the notification type is not supported
   *
   * @example
   * ```typescript
   * const notification = NotificationServiceFactory.create('in-memory', notificationDriver);
   * ```
   */
  static create(notificationType: string, driver: unknown): INotification {
    switch (notificationType.toLowerCase()) {
      case 'in-memory':
      case 'inmemory':
        return this.createInMemoryNotificationService(driver as undefined);

      // Future provider support:
      // case 'fcm':
      //   return this.createFCMNotificationService(driver as FCMDriver);
      //
      // case 'sns':
      //   return this.createSNSNotificationService(driver as SNSDriver);
      //
      // case 'onesignal':
      //   return this.createOneSignalNotificationService(driver as OneSignalDriver);

      default:
        throw new Error(`Unsupported notification type: ${notificationType}`);
    }
  }
}
