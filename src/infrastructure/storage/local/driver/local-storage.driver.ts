/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { constants } from 'fs';
import * as fs from 'fs/promises';

import type { ICoreDriver, IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import type { IFileSystemStorageConfig } from './local-file-storage.config';

/**
 * Driver for the local file system storage. Its client is the storage root folder: `init()` makes sure the folder
 * exists and can be read and written, and `health()` checks that it still can.
 *
 * @class LocalStorageDriver
 * @implements {ICoreDriver<string, IFileSystemStorageConfig>}
 */
export class LocalStorageDriver implements ICoreDriver<string, IFileSystemStorageConfig> {
  private readonly _config: IFileSystemStorageConfig;

  private _client: string | undefined;

  constructor(config: IFileSystemStorageConfig) {
    this._config = config;
  }

  /**
   * Create the root folder when it is missing and check that it can be read and written.
   *
   * @returns {Promise<void>} Resolves once the root folder is ready to use.
   * @throws {DriverError} When the root folder can't be created, or can't be read or written.
   */
  async init(): Promise<void> {
    const rootPath = this._config.params.rootPath;
    try {
      await fs.mkdir(rootPath, { recursive: true });
      await fs.access(rootPath, constants.R_OK | constants.W_OK);
      this._client = rootPath;
    } catch (error: unknown) {
      throw new DriverError(
        `Failed to initialize LocalStorageDriver: "${rootPath}" is not a readable, writable folder: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get the driver configuration.
   *
   * @returns {IFileSystemStorageConfig} The configuration the driver was built with.
   */
  config(): IFileSystemStorageConfig {
    return this._config;
  }

  /**
   * Get the storage root folder, as configured.
   *
   * @returns {string | undefined} The root folder, or undefined before `init()` and after `shutdown()`.
   */
  client(): string | undefined {
    return this._client;
  }

  /**
   * Release the root folder. Nothing stays open on the file system, so there is nothing to close.
   *
   * @returns {Promise<void>} Resolves at once.
   */
  async shutdown(): Promise<void> {
    this._client = undefined;
  }

  /**
   * Check that the root folder still exists and can be read and written. Never throws: a failed check is reported
   * as not connected.
   *
   * @returns {Promise<IDriverHealthStatus>} Whether the folder is usable, with the time the check took (ms).
   */
  async health(): Promise<IDriverHealthStatus> {
    const rootPath = this._client;
    if (rootPath === undefined) {
      return { connected: false, error: 'Local storage not initialized' };
    }
    try {
      const start = process.hrtime.bigint();
      const stats = await fs.stat(rootPath);
      if (!stats.isDirectory()) {
        return { connected: false, error: `"${rootPath}" is not a folder` };
      }
      await fs.access(rootPath, constants.R_OK | constants.W_OK);
      const latency = Number((process.hrtime.bigint() - start) / BigInt(1000000)); // ns -> ms
      return { connected: true, latency };
    } catch (error: unknown) {
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
