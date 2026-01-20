/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import { type ISocketConfig } from '../../config/service/socket.config';
import { SocketsService } from './sockets.service';
import type { Server } from 'socket.io';

export const socketsServiceLoader = async (
  container: AwilixContainer,
  config: ISocketConfig,
): Promise<SocketsService> => {
  try {
    const svc = new SocketsService();
    await svc.init(container, config);
    const client = svc.service() as Server | undefined;
    if (!client || typeof client.emit !== 'function') {
      throw new InfiniteNodeError('Sockets client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return svc;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load SocketsService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
