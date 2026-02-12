/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { SocketsDriver } from './sockets.driver';
import { socketConfig } from './socket.config';

/**
 * Loader function to create and initialize the SocketsDriver instance
 *
 * @returns {Promise<SocketsDriver>} Initialized SocketsDriver instance
 */
export const socketDriverLoader = async (): Promise<SocketsDriver> => {
  const driver = new SocketsDriver(socketConfig());
  await driver.init();
  return driver;
};
