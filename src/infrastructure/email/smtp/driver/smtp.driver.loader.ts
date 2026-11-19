/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { smtpConfig } from './smtp.config';
import { SMTPDriver } from './smtp.driver';

/**
 * Create the SMTP driver from its environment configuration and initialize it.
 *
 * @returns {Promise<SMTPDriver>} The initialized driver.
 */
export const smtpDriverLoader = async (): Promise<SMTPDriver> => {
  const driver = new SMTPDriver(smtpConfig());
  await driver.init();
  return driver;
};
