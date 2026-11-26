/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { storageConfig } from './local-file-storage.config';
import { LocalStorageDriver } from './local-storage.driver';

/**
 * Build the local storage driver from `STORAGE_ROOT_PATH` and prepare its root folder.
 *
 * @returns {Promise<LocalStorageDriver>} The initialized driver.
 * @throws {DriverError} When the root folder can't be created, or can't be read or written.
 */
export const localStorageDriverLoader = async (): Promise<LocalStorageDriver> => {
  const driver = new LocalStorageDriver(storageConfig());
  await driver.init();
  return driver;
};
