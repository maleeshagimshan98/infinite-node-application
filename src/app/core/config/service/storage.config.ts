/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IStorageConfig extends IServiceConfig {
  driver: string;
  fileSystem: {
    rootPath: string;
  };
}

export const storageConfig = (): IStorageConfig => ({
  driver: process.env.STORAGE_DRIVER || 'fileSystem',
  singleton: false,
  deferred: true,
  fileSystem: {
    rootPath: process.env.STORAGE_ROOT_PATH || '/var/infinite_node/storage',
  },
});
