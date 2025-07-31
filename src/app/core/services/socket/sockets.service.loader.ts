/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Server } from 'socket.io';
import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import type { ISocketConfig } from '../../config/service/socket.config';

export const socketsServiceLoader = (name: string, container: AwilixContainer, options: ISocketConfig): void => {
  try {
    const socketsService = new Server(container.resolve('httpServer'));
    registerService(name, container, options, socketsService);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load SocketsService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
