/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IPushNotificationService } from '@/application/interfaces/infrastructure/push-notification/push-notification-service.interface';
import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { isSnsOutage } from '@/infrastructure/push-notification/sns/error/sns-error.guards';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';
import { inMemoryNotificationDriverLoader } from './in-memory/driver/in-memory-notification.driver.loader';
import { SNSPushNotificationService } from './sns/sns-push-notification.service';
import { snsDriverLoader } from './sns/driver/sns.driver.loader';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

/**
 * Factory class for creating push notification service instances
 *
 * Provides methods to instantiate push notification services with their respective drivers.
 * The factory handles driver creation, initialization, and service instantiation.
 *
 * @class PushNotificationServiceFactory
 *
 * @example
 * ```typescript
 * const factory = new PushNotificationServiceFactory();
 * const pushNotification = await factory.create();
 * ```
 */
export class PushNotificationServiceFactory implements IServiceFactory<IPushNotificationService> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'pushNotification'} Service registration name
   */
  name(): 'pushNotification' {
    return 'pushNotification';
  }

  /**
   * Creates an In-Memory push notification service instance
   *
   * This method creates and initializes the InMemoryNotificationDriver,
   * then constructs and returns an InMemoryNotificationService with the initialized driver.
   *
   * @returns {Promise<IPushNotificationService>} A promise that resolves to an initialized In-Memory push
   * notification service instance
   * @throws {Error} If driver initialization fails
   *
   * @example
   * ```typescript
   * const factory = new PushNotificationServiceFactory();
   * const pushNotification = await factory.createInMemoryNotificationService();
   * await pushNotification.sendNotification('user123', { title: 'Hello', body: 'World' });
   * ```
   */
  async createInMemoryNotificationService(): Promise<IPushNotificationService> {
    return new InMemoryNotificationService(await inMemoryNotificationDriverLoader());
  }

  /**
   * Creates the AWS SNS push notification service. Publishes are guarded by a circuit breaker that counts only
   * outages, not notifications SNS refuses.
   *
   * @returns {Promise<IPushNotificationService>} A promise that resolves to an SNS push notification service instance
   * @throws {DriverError} If no AWS region is configured
   * @throws {RangeError} If the configured circuit breaker settings are invalid
   */
  async createSNSPushNotificationService(): Promise<IPushNotificationService> {
    const driver = await snsDriverLoader();
    const circuitBreaker = new CircuitBreaker({
      name: 'aws_sns',
      ...driver.config().circuitBreaker,
      isFailure: isSnsOutage,
    });
    return new SNSPushNotificationService(driver, circuitBreaker);
  }

  /**
   * Creates a push notification service instance based on the configured push notification driver
   *
   * This is a generic factory method that routes to specific service creation methods
   * based on `PUSH_NOTIFICATION_DRIVER`.
   *
   * @returns {Promise<IPushNotificationService>} A promise that resolves to a push notification service instance
   * @throws {InfrastructureError} DRIVER_ERROR if the push notification driver is not supported
   * @throws {DriverError} If the SNS driver is selected and no AWS region is configured
   * @throws {RangeError} If the SNS driver is selected and its circuit breaker settings are invalid
   *
   * @example
   * ```typescript
   * const factory = new PushNotificationServiceFactory();
   * const pushNotification = await factory.create();
   * await pushNotification.broadcastNotification({ title: 'System Update', body: 'Maintenance scheduled' });
   * ```
   */
  async create(): Promise<IPushNotificationService> {
    const notificationType = process.env.PUSH_NOTIFICATION_DRIVER || 'inmemory';
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
        throw new InfrastructureError(`Unsupported push notification driver: ${notificationType}`, 'DRIVER_ERROR', {
          notificationType,
        });
    }
  }
}
