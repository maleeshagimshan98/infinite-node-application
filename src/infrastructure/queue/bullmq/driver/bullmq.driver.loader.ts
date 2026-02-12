/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { QueueDriver } from './bullmq.driver';
import { queueConfig } from './queue.config';

/**
 * Asynchronously loads and initializes the BullMQ QueueDriver
 *
 * @returns {Promise<QueueDriver>} An initialized instance of the BullMQ QueueDriver
 */
export const bullmqDriverLoader = async (): Promise<QueueDriver> => {
  const driver = new QueueDriver(queueConfig());
  await driver.init();
  return driver;
};
