/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MongooseDriver } from './mongoose.driver';
import { mongooseConfig } from './mongoose.config';

export const mongooseDriverLoader = async (): Promise<MongooseDriver> => {
  const driver = new MongooseDriver(mongooseConfig());
  await driver.init();
  return driver;
};
