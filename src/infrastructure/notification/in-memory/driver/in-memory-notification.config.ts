/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

/**
 * Configuration interface for In-Memory Notification Driver
 *
 * Defines the configuration structure for the in-memory notification implementation.
 * This serves as a placeholder and can be extended with additional parameters as needed.
 */
export interface IInMemoryNotificationConfig extends IDriverConfig {
  /**
   * Optional driver-specific parameters
   * Can be extended with settings like max queue size, batch size, etc.
   */
  params?: {
    /**
     * Maximum number of notifications to queue in memory
     */
    maxQueueSize?: number;
    /**
     * Enable notification logging for debugging
     */
    enableLogging?: boolean;
  };
}

/**
 * Creates and returns the In-Memory Notification configuration
 *
 * Loads configuration from environment variables with sensible defaults.
 *
 * @returns {IInMemoryNotificationConfig} The notification configuration object
 *
 * @example
 * ```typescript
 * const config = inMemoryNotificationConfig();
 * const driver = new InMemoryNotificationDriver();
 * await driver.init(config);
 * ```
 */
export const inMemoryNotificationConfig = (): IInMemoryNotificationConfig => ({
  driverName: 'InMemoryNotificationDriver',
  singleton: true,
  deferred: false,
  params: {
    maxQueueSize: Number(process.env.NOTIFICATION_MAX_QUEUE_SIZE) || 1000,
    enableLogging: process.env.NOTIFICATION_LOGGING === 'true',
  },
});
