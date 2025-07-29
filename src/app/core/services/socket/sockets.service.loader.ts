/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Server } from 'socket.io';
import type { AwilixContainer } from 'awilix';
import { asFunction } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';

export const socketsServiceLoader = (container: AwilixContainer): void => {
  try {
    const socketsService = new Server(container.resolve('httpServer'));
    container.register({
      socket: asFunction(() => socketsService).singleton(),
    });
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load SocketsService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
