/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IFileSystemStorageConfig extends IServiceConfig {
  params: {
    rootPath: string;
  };
}

export const storageConfig = (): IFileSystemStorageConfig => ({
  serviceName: 'storage',
  singleton: false,
  deferred: true,
  params: {
    rootPath: process.env.STORAGE_ROOT_PATH || 'storage',
  },
});
