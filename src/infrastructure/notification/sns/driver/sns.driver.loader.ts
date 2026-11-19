/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { snsConfig } from './sns.config';
import { SNSDriver } from './sns.driver';

/**
 * Loader function for the AWS SNS push notification driver
 *
 * @returns {Promise<SNSDriver>} The initialized SNS driver
 * @throws {DriverError} When no AWS region is configured
 */
export const snsDriverLoader = async (): Promise<SNSDriver> => {
  const driver = new SNSDriver(snsConfig());
  await driver.init();
  return driver;
};
