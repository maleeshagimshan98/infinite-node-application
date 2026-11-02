/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { sesConfig } from './ses.config';
import { SESDriver } from './ses.driver';

export const sesDriverLoader = async (): Promise<SESDriver> => {
  const driver = new SESDriver(sesConfig());
  await driver.init();
  return driver;
};
