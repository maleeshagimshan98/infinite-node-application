/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { WinstonDriver } from './winston.driver';
import { winstonConfig } from './winston.config';

/**
 * Winston Driver Loader
 * Factory function to create and initialize a WinstonDriver instance with the default configuration.
 *
 * @returns {Promise<WinstonDriver>} The initialized WinstonDriver instance
 */
export const winstonDriverLoader = async (): Promise<WinstonDriver> => {
  const driver = new WinstonDriver(winstonConfig());
  await driver.init();
  return driver;
};
