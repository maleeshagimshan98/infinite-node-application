/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { container } from '@/app/core/service.container';

import { SocketsDriver } from './sockets.driver';
import { socketConfig } from './socket.config';

import type { Server as HttpServer } from 'http';

/**
 * Loader function to create and initialize the SocketsDriver instance
 *
 * Resolves the HTTP server from the DI container and injects it into the driver.
 * This implements the Composition Root pattern - dependency resolution happens
 * at the application edge (loader), while the driver remains pure and testable.
 *
 * @returns {Promise<SocketsDriver>} Initialized SocketsDriver instance
 * @throws {Error} If httpServer is not registered in the container
 */
export const socketDriverLoader = async (): Promise<SocketsDriver> => {
  const httpServer = container.resolve<HttpServer>('httpServer');
  const driver = new SocketsDriver(socketConfig(), httpServer);
  await driver.init();
  return driver;
};
