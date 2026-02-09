/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import { type ISocketConfig } from '../../config/drivers/socket.config';
import { SocketsDriver } from './sockets.driver';
import type { Server } from 'socket.io';

export const socketsDriverLoader = async (
  container: AwilixContainer,
  config: ISocketConfig,
): Promise<SocketsDriver> => {
  try {
    const svc = new SocketsDriver();
    await svc.init(container, config);
    const client = svc.driver() as Server | undefined;
    if (!client || typeof client.emit !== 'function') {
      throw new InfiniteNodeError('Sockets client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return svc;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load SocketsDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
