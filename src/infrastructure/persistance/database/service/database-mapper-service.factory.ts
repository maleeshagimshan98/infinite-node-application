/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDatabaseMapper } from '@/application/interfaces/infrastructure/database-mapper.interface';
import type { IServiceFactory } from '@/infrastructure/core/interfaces/service.factory.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { MongooseService } from './database-mapper/mongoose.service';
import { mongooseDriverLoader } from './database-mapper/driver/mongoose.driver.loader';

export type DatabaseMapperDriverType = 'mongoose' | 'sequelize' | 'typeorm' | 'prisma';

/**
 * Factory class for creating ORM service instances
 *
 * Provides methods to instantiate ORM services based on the driver type.
 * Follows the same pattern as StorageServiceFactory and DatabaseServiceFactory for consistency.
 *
 * @example
 * ```typescript
 * const factory = new DatabaseMapperServiceFactory();
 * const databaseMapperService = await factory.create();
 * ```
 */
export class DatabaseMapperServiceFactory implements IServiceFactory<IDatabaseMapper> {
  /**
   * Type guard to validate database mapper driver type
   *
   * @param {unknown} driver - The value to check
   * @returns {driver is DatabaseMapperDriverType} True if the value is a valid database mapper driver type
   */
  private isValidDatabaseMapperDriver(driver: unknown): driver is DatabaseMapperDriverType {
    const validDrivers: DatabaseMapperDriverType[] = ['mongoose', 'sequelize', 'typeorm', 'prisma'];
    return typeof driver === 'string' && validDrivers.includes(driver as DatabaseMapperDriverType);
  }

  /**
   * Create a Mongoose service instance
   *
   * @returns {IDatabaseMapper} Mongoose service implementation
   *
   * @example
   * ```typescript
   * const factory = new DatabaseMapperServiceFactory();
   * const databaseMapperService = await factory.createMongooseService();
   * ```
   */
  async createMongooseService(): Promise<IDatabaseMapper> {
    const mongooseService = new MongooseService(await mongooseDriverLoader());
    return mongooseService;
  }

  /**
   * Create a service instance based on configuration
   *
   * Currently supports Mongoose only, but can be extended for other service providers.
   *
   * @returns {IDatabaseMapper} implementation
   * @throws {InfrastructureError} if driver is not supported
   *
   * @example
   * ```typescript
   * const factory = new DatabaseMapperServiceFactory();
   * const databaseMapperService = await factory.create();
   * ```
   */
  async create(): Promise<IDatabaseMapper> {
    const envDriver = process.env.DATABASE_MAPPER_DRIVER || 'mongoose';
    if (!this.isValidDatabaseMapperDriver(envDriver)) {
      throw new InfrastructureError(`Invalid database mapper driver: ${envDriver}`, 'DRIVER_ERROR', {
        envDriver,
      });
    }
    const driver: DatabaseMapperDriverType = envDriver;
    switch (driver) {
      case 'mongoose':
        return this.createMongooseService();

      case 'sequelize':
        throw new InfrastructureError('Sequelize ORM service not yet implemented', 'DRIVER_ERROR', {
          driver,
        });

      case 'typeorm':
        throw new InfrastructureError('TypeORM service not yet implemented', 'DRIVER_ERROR', {
          driver,
        });

      case 'prisma':
        throw new InfrastructureError('Prisma ORM service not yet implemented', 'DRIVER_ERROR', {
          driver,
        });

      default:
        throw new InfrastructureError(`Unsupported ORM driver: ${driver}`, 'DRIVER_ERROR', {
          driver,
        });
    }
  }
}
