/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { sesConfig } from './ses.config';
import { SESDriver } from './ses.driver';

/**
 * Create the SES driver from its environment configuration and initialize it.
 *
 * @returns {Promise<SESDriver>} The initialized driver.
 * @throws {DriverError} when no AWS region is configured.
 */
export const sesDriverLoader = async (): Promise<SESDriver> => {
  const driver = new SESDriver(sesConfig());
  await driver.init();
  return driver;
};
