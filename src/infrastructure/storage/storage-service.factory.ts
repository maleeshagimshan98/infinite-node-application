/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IStorage } from '@/application/interfaces/infrastructure/storage.interface';

import { LocalStorageService } from './local/local-storage.service';
import { InfrastructureError } from '../core/errors/infrastructure.error';

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
   * Create a storage service instance using the provided local file storage driver
   *
   * @returns {Promise<IStorage>} implementation
   */
  async createLocalStorageService(): Promise<IStorage> {
    return new LocalStorageService();
  }

  /**
   * Create a storage service instance based on configuration
   * Currently supports local storage only, but can be extended for other providers
   *
   * @returns {Promise<IStorage>} implementation
   * @throws {InfrastructureError} if driver is not supported
   */
  async create(): Promise<IStorage> {
    const driver = process.env.STORAGE_DRIVER || 'filesystem';
    switch (driver) {
      case 'filesystem':
        return new LocalStorageService();

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
