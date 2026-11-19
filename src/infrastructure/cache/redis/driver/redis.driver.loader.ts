/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { redisConfig } from './redis.config';
import { RedisDriver } from './redis.driver';

/**
 * Redis driver loader function
 * Initializes the Redis driver and returns the instance
 *
 * @returns {Promise<RedisDriver>}
 * @throws {Error} when the Redis client cannot connect (the node-redis error, unchanged).
 */
export const redisDriverLoader = async (): Promise<RedisDriver> => {
  const driver = new RedisDriver(redisConfig());
  await driver.init();
  return driver;
};
