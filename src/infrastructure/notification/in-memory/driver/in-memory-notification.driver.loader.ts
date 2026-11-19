/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { inMemoryNotificationConfig } from './in-memory-notification.config';
import { InMemoryNotificationDriver } from './in-memory-notification.driver';

/**
 * Loader function for the In-Memory Notification Driver
 *
 * @returns {Promise<InMemoryNotificationDriver>} The initialized In-Memory Notification Driver
 * @throws {Error} when the driver cannot be initialized.
 */
export const inMemoryNotificationDriverLoader = async (): Promise<InMemoryNotificationDriver> => {
  const driver = new InMemoryNotificationDriver(inMemoryNotificationConfig());
  await driver.init();
  return driver;
};
