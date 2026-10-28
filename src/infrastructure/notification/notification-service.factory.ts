/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INotification } from '@/application/interfaces/infrastructure/notification.interface';

import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';
import { inMemoryNotificationDriverLoader } from './in-memory/driver/in-memory-notification.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

/**
 * Factory class for creating notification service instances
 *
 * Provides methods to instantiate notification services with their respective drivers.
 * The factory handles driver creation, initialization, and service instantiation.
 *
 * @class NotificationServiceFactory
 *
 * @example
 * ```typescript
 * const factory = new NotificationServiceFactory();
 * const notification = await factory.create();
 * ```
 */
export class NotificationServiceFactory implements IServiceFactory<INotification> {
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
   * const factory = new NotificationServiceFactory();
   * const notification = await factory.createInMemoryNotificationService();
   * await notification.sendNotification('user123', { title: 'Hello', body: 'World' });
   * ```
   */
  async createInMemoryNotificationService(): Promise<INotification> {
    return new InMemoryNotificationService(await inMemoryNotificationDriverLoader());
  }

  /**
   * Creates a notification service instance based on the configured notification driver type
   *
   * This is a generic factory method that routes to specific service creation methods
   * based on the configured notification driver.
   *
   * @returns {Promise<INotification>} A promise that resolves to a notification service instance
   * @throws {InfrastructureError} If the notification type is not supported or if initialization fails
   *
   * @example
   * ```typescript
   * const factory = new NotificationServiceFactory();
   * const notification = await factory.create();
   * await notification.broadcastNotification({ title: 'System Update', body: 'Maintenance scheduled' });
   * ```
   */
  async create(): Promise<INotification> {
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
        throw new InfrastructureError(`Unsupported notification type: ${notificationType}`, 'DRIVER_ERROR', {
          notificationType,
        });
    }
  }
}
