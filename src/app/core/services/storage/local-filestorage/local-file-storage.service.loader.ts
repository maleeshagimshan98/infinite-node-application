/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../../service.container';
import { type IFileSystemStorageConfig } from '../../../config/service/local-file-storage.config';
import { LocalFileStorageService } from './local-file-storage.service';
import type { LocalFileStorageClient } from './local-file-storage-client';

export const localFileStorageServiceLoader = async (
  container: AwilixContainer,
  config: IFileSystemStorageConfig,
): Promise<LocalFileStorageService> => {
  try {
    const storageService = new LocalFileStorageService();
    await storageService.init(container, config);
    const client = storageService.service() as LocalFileStorageClient | undefined;
    if (!client || typeof client.read !== 'function' || typeof client.write !== 'function') {
      throw new InfiniteNodeError('Storage client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return storageService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load StorageService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
