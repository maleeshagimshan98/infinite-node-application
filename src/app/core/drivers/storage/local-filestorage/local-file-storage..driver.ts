/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../../service.container';
import { type IFileSystemStorageConfig } from '../../../config/drivers/local-file-storage.config';
import { LocalFileStorageDriver } from './local-file-storage.driver';
import type { LocalFileStorageClient } from './local-file-storage-client';

export const localFileStorageDriverLoader = async (
  container: AwilixContainer,
  config: IFileSystemStorageConfig,
): Promise<LocalFileStorageDriver> => {
  try {
    const storageDriver = new LocalFileStorageDriver();
    await storageDriver.init(container, config);
    const client = storageDriver.driver() as LocalFileStorageClient | undefined;
    if (!client || typeof client.read !== 'function' || typeof client.write !== 'function') {
      throw new InfiniteNodeError('Storage client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return storageDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load StorageDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
