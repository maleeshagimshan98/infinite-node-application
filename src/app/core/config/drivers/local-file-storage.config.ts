/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from './core.driver.config';

export interface IFileSystemStorageConfig extends IDriverConfig {
  params: {
    rootPath: string;
  };
}

export const storageConfig = (): IFileSystemStorageConfig => ({
  driverName: 'storage',
  singleton: false,
  deferred: true,
  optional: process.env.STORAGE_SERVICE_OPTIONAL === 'false',
  params: {
    rootPath: process.env.STORAGE_ROOT_PATH || 'storage',
  },
});
