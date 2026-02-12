/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IStorage } from '@/application/interfaces/storage.interface';

import { LocalStorageService } from './local/local-storage.service';
import { InfrastructureError } from '../core/errors/infrastructure.error';

export type StorageDriverType = 'local' | 'aws' | 'gcp' | 'azure';

export class StorageServiceFactory {
  /**
   * Create a storage service instance using the provided local file storage driver
   *
   * @param storageClient - Local file storage client instance from the driver layer
   * @returns {IStorage} implementation
   */
  static createLocalStorageService(): IStorage {
    return new LocalStorageService();
  }

  /**
   * Create a storage service instance based on configuration
   * Currently supports local storage only, but can be extended for other providers
   *
   * @param driver - Storage driver type ('local', 'aws', 'gcp', 'azure', etc.)
   * @param client - Client instance from the driver layer
   * @returns {IStorage} implementation
   * @throws {InfrastructureError} if driver is not supported
   */
  static create(): IStorage {
    const driver = process.env.STORAGE_DRIVER || 'local';
    switch (driver) {
      case 'filesystem':
        return new LocalStorageService();

      case 'aws':
        throw new InfrastructureError('AWS S3 storage service not yet implemented');

      case 'gcp':
        throw new InfrastructureError('Google Cloud Storage service not yet implemented');

      case 'azure':
        throw new InfrastructureError('Azure Blob Storage service not yet implemented');

      default:
        throw new InfrastructureError(`Unsupported storage driver: ${driver}`);
    }
  }
}
