/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MongooseDriver } from './mongoose.driver';
import { mongooseConfig } from './mongoose.config';

/**
 * Create the Mongoose driver from its environment configuration and initialize it.
 *
 * @returns {Promise<MongooseDriver>} The initialized driver.
 * @throws {DriverError} when the connection cannot be established.
 */
export const mongooseDriverLoader = async (): Promise<MongooseDriver> => {
  const driver = new MongooseDriver(mongooseConfig());
  await driver.init();
  return driver;
};
