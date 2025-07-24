/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { asFunction } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';

export const storageServiceLoader = (container: AwilixContainer): void => {
  try {
    // Assuming StorageService is defined and imported correctly
    const storageService = 'new StorageService()';
    container.register({
      storageService: asFunction(() => storageService).singleton(),
    });
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load StorageService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
