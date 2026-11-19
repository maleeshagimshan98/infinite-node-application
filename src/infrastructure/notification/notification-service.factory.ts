/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INotificationManager } from '@/application/interfaces/infrastructure/notification/notification-manager.interface';
import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { isSnsOutage } from '@/infrastructure/notification/sns/error/sns-error.guards';

import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';
import { inMemoryNotificationDriverLoader } from './in-memory/driver/in-memory-notification.driver.loader';
import { SNSPushNotificationService } from './sns/sns-push-notification.service';
import { snsDriverLoader } from './sns/driver/sns.driver.loader';
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
export class NotificationServiceFactory implements IServiceFactory<INotificationManager> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'notification'} Service registration name
   */
  name(): 'notification' {
    return 'notification';
  }

  /**
   * Creates an In-Memory notification service instance
   *
   * This method creates and initializes the InMemoryNotificationDriver,
   * then constructs and returns an InMemoryNotificationService with the initialized driver.
   *
   * @returns {Promise<INotificationManager>} A promise that resolves to an initialized In-Memory notification service instance
   * @throws {Error} If driver initialization fails
   *
   * @example
   * ```typescript
   * const factory = new NotificationServiceFactory();
   * const notification = await factory.createInMemoryNotificationService();
   * await notification.sendNotification('user123', { title: 'Hello', body: 'World' });
   * ```
   */
  async createInMemoryNotificationService(): Promise<INotificationManager> {
    return new InMemoryNotificationService(await inMemoryNotificationDriverLoader());
  }

  /**
   * Creates the AWS SNS push notification service. Publishes are guarded by a circuit breaker that counts only
   * outages, not notifications SNS refuses.
   *
   * @returns {Promise<INotificationManager>} A promise that resolves to an SNS push notification service instance
   * @throws {DriverError} If no AWS region is configured
   * @throws {RangeError} If the configured circuit breaker settings are invalid
   */
  async createSNSPushNotificationService(): Promise<INotificationManager> {
    const driver = await snsDriverLoader();
    const circuitBreaker = new CircuitBreaker({
      name: 'aws_sns',
      ...driver.config().circuitBreaker,
      isFailure: isSnsOutage,
    });
    return new SNSPushNotificationService(driver, circuitBreaker);
  }

  /**
   * Creates a notification service instance based on the configured notification driver type
   *
   * This is a generic factory method that routes to specific service creation methods
   * based on the configured notification driver.
   *
   * @returns {Promise<INotificationManager>} A promise that resolves to a notification service instance
   * @throws {InfrastructureError} If the notification type is not supported
   * @throws {DriverError} If the SNS driver is selected and no AWS region is configured
   * @throws {RangeError} If the SNS driver is selected and its circuit breaker settings are invalid
   *
   * @example
   * ```typescript
   * const factory = new NotificationServiceFactory();
   * const notification = await factory.create();
   * await notification.broadcastNotification({ title: 'System Update', body: 'Maintenance scheduled' });
   * ```
   */
  async create(): Promise<INotificationManager> {
    const notificationType = process.env.NOTIFICATION_DRIVER || 'inmemory';
    switch (notificationType.toLowerCase()) {
      case 'in-memory':
      case 'inmemory':
        return await this.createInMemoryNotificationService();
      case 'aws-sns':
        return await this.createSNSPushNotificationService();

      // Future provider support:
      // case 'fcm':
      //   return await this.createFCMNotificationService();
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
