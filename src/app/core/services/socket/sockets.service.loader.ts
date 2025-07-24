/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { asFunction } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';

export const socketsServiceLoader = (container: AwilixContainer): void => {
  try {
    // Assuming SocketsService is defined and imported correctly
    const socketsService = 'new SocketsService()';
    container.register({
      socketsService: asFunction(() => socketsService).singleton(),
    });
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load SocketsService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
