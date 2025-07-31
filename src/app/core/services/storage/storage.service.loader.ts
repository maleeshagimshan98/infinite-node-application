/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import type { IStorageConfig } from '../../config/service/storage.config';

export const storageServiceLoader = (name: string, container: AwilixContainer, options: IStorageConfig): void => {
  try {
    // Assuming StorageService is defined and imported correctly
    const storageService = 'new StorageService()';
    registerService(name, container, options, storageService);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load StorageService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
