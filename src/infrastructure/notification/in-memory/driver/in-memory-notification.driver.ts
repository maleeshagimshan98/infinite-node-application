/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import type { IInMemoryNotificationConfig } from './in-memory-notification.config';

/**
 * In-Memory Notification Driver
 *
 * Provides an in-memory notification bus implementation that stores notifications
 * temporarily. This serves as a placeholder driver for development and testing.
 * In production, this should be replaced with real notification providers like
 * FCM, SNS, OneSignal, etc.
 *
 * @class InMemoryNotificationDriver
 *
 * @example
 * ```typescript
 * const driver = new InMemoryNotificationDriver({ params: { maxQueueSize: 500 } });
 * await driver.init();
 * const client = driver.driver();
 * ```
 */
export class InMemoryNotificationDriver implements ICoreDriver<unknown, IInMemoryNotificationConfig> {
  /**
   * The in-memory notification client instance (currently undefined as placeholder)
   *
   * @private
   * @type {unknown | undefined}
   */
  private _client: undefined;

  /**
   * The configuration for this driver
   *
   * @private
   * @type {IInMemoryNotificationConfig}
   */
  private _config: IInMemoryNotificationConfig;

  constructor(config: IInMemoryNotificationConfig) {
    this._config = config;
  }

  /**
   * Initializes the In-Memory Notification driver with the provided configuration
   *
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   *
   * @example
   * ```typescript
   * const driver = new InMemoryNotificationDriver({ params: { maxQueueSize: 500 } });
   * await driver.init();
   * ```
   */
  async init(): Promise<void> {
    try {
      // Placeholder in-memory notification bus
      // In a real implementation, this would initialize the notification provider client
      // Example: this.client = new NotificationClient(config);
      this._client = undefined;

      if (this._config.params?.enableLogging) {
        console.log('[InMemoryNotificationDriver] Initialized with config:', this._config);
      }
    } catch (err: unknown) {
      throw new InfrastructureError(
        `Failed to initialize InMemoryNotificationDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'DRIVER_ERROR',
        {
          error: err instanceof Error ? err.message : 'Unknown error',
          config: this._config,
        },
      );
    }
  }

  /**
   * Returns the configuration for this driver
   *
   * @returns {IInMemoryNotificationConfig} The driver configuration object
   */
  config(): IInMemoryNotificationConfig {
    return this._config;
  }

  /**
   * Returns the underlying notification client
   *
   * @returns {undefined} The notification client (currently undefined as placeholder)
   *
   * @example
   * ```typescript
   * const client = driver.driver();
   * ```
   */
  client(): undefined {
    return this._client;
  }

  /**
   * Shuts down the notification driver and cleans up resources
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * await driver.shutdown();
   * ```
   */
  async shutdown(): Promise<void> {
    // Cleanup resources if necessary
    this._client = undefined;
  }
}
