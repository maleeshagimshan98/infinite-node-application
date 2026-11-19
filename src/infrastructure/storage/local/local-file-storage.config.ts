/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

export interface IFileSystemStorageConfig extends IDriverConfig {
  params: {
    rootPath: string;
  };
}

/**
 * Build the local storage configuration from the environment (`STORAGE_ROOT_PATH`, `STORAGE_SERVICE_OPTIONAL`), with local defaults.
 *
 * @returns {IFileSystemStorageConfig} The local storage configuration.
 */
export const storageConfig = (): IFileSystemStorageConfig => ({
  driverName: 'storage',
  singleton: false,
  deferred: true,
  optional: process.env.STORAGE_SERVICE_OPTIONAL === 'true',
  params: {
    rootPath: process.env.STORAGE_ROOT_PATH || './storage',
  },
});
