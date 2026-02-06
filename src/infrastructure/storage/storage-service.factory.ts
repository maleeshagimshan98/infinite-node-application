/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IStorage } from '@/application/interfaces/storage.interface';
import type { LocalFileStorageClient } from '@/app/core/services/storage/local-filestorage/local-file-storage-client';
import { LocalStorageService } from './local/local-storage.service';

export type StorageDriverType = 'local' | 'aws' | 'gcp' | 'azure';

export class StorageServiceFactory {
  /**
   * Create a storage service instance using the provided local file storage driver
   *
   * @param storageClient - Local file storage client instance from the driver layer
   * @returns {IStorage} implementation
   */
  static createLocalStorageService(storageClient: LocalFileStorageClient): IStorage {
    return new LocalStorageService(storageClient);
  }

  /**
   * Create a storage service instance based on configuration
   * Currently supports local storage only, but can be extended for other providers
   *
   * @param driver - Storage driver type ('local', 'aws', 'gcp', 'azure', etc.)
   * @param client - Client instance from the driver layer
   * @returns {IStorage} implementation
   * @throws {Error} if driver is not supported
   */
  static create(driver: StorageDriverType, client: unknown): IStorage {
    switch (driver) {
      case 'local':
        return new LocalStorageService(client as LocalFileStorageClient);

      case 'aws':
        throw new Error('AWS S3 storage service not yet implemented');

      case 'gcp':
        throw new Error('Google Cloud Storage service not yet implemented');

      case 'azure':
        throw new Error('Azure Blob Storage service not yet implemented');

      default:
        throw new Error(`Unsupported storage driver: ${driver}`);
    }
  }
}
