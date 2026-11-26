/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IStorage } from '@/application/interfaces/infrastructure/storage.interface';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { LocalStorageService } from './local/local-storage.service';
import { localStorageDriverLoader } from './local/driver/local-storage.driver.loader';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

export type StorageDriverType = 'filesystem' | 'aws' | 'gcp' | 'azure';

export class StorageServiceFactory implements IServiceFactory<IStorage> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'storage'} Service registration name
   */
  name(): 'storage' {
    return 'storage';
  }

  /**
   * Create the local file system storage service, with its root folder ready to use
   *
   * @returns {Promise<IStorage>} implementation
   * @throws {DriverError} When the root folder can't be created, or can't be read or written.
   */
  async createLocalStorageService(): Promise<IStorage> {
    return new LocalStorageService(await localStorageDriverLoader());
  }

  /**
   * Create a storage service instance based on configuration
   * Currently supports local storage only, but can be extended for other providers
   *
   * @returns {Promise<IStorage>} implementation
   * @throws {InfrastructureError} DRIVER_ERROR if the driver is not supported
   * @throws {DriverError} When the local storage root folder can't be created, or can't be read or written.
   */
  async create(): Promise<IStorage> {
    const driver = process.env.STORAGE_DRIVER || 'filesystem';
    switch (driver) {
      case 'filesystem':
        return await this.createLocalStorageService();

      case 'aws':
        throw new InfrastructureError('AWS S3 storage service not yet implemented', 'DRIVER_ERROR', {
          provider: 'aws',
        });

      case 'gcp':
        throw new InfrastructureError('Google Cloud Storage service not yet implemented', 'DRIVER_ERROR', {
          provider: 'gcp',
        });

      case 'azure':
        throw new InfrastructureError('Azure Blob Storage service not yet implemented', 'DRIVER_ERROR', {
          provider: 'azure',
        });

      default:
        throw new InfrastructureError(`Unsupported storage driver: ${driver}`, 'DRIVER_ERROR', {
          driver,
        });
    }
  }
}
