/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDatabaseMapper } from '@/application/interfaces/database-mapper.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { MongooseService } from './database-mapper/mongoose.service';
import { mongooseDriverLoader } from './database-mapper/driver/mongoose.driver.loader';

export type DatabaseMapperDriverType = 'mongoose' | 'sequelize' | 'typeorm' | 'prisma';

/**
 * Factory class for creating ORM service instances
 *
 * Provides static methods to instantiate ORM services based on the driver type.
 * Follows the same pattern as StorageServiceFactory and DatabaseServiceFactory for consistency.
 *
 * @example
 * ```typescript
 * // Create a Mongoose service
 * const databaseMapperService = await DatabaseMapperServiceFactory.createMongooseService();
 * ```
 *
 * // Using the generic factory method
 * const databaseMapperService = await DatabaseMapperServiceFactory.create('mongoose');
 * ```
 */
export class DatabaseMapperServiceFactory {
  /**
   * Type guard to validate database mapper driver type
   *
   * @param {unknown} driver - The value to check
   * @returns {driver is DatabaseMapperDriverType} True if the value is a valid database mapper driver type
   */
  private static isValidDatabaseMapperDriver(driver: unknown): driver is DatabaseMapperDriverType {
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
   * const databaseMapperService = await DatabaseMapperServiceFactory.createMongooseService();
   * ```
   */
  static async createMongooseService(): Promise<IDatabaseMapper> {
    const mongooseService = new MongooseService(await mongooseDriverLoader());
    return mongooseService;
  }

  /**
   * Create a service instance based on configuration
   *
   * Currently supports Mongoose only, but can be extended for other service providers.
   *
   * @param {DatabaseMapperDriverType} driver - database mapper driver type ('mongoose', 'sequelize', 'typeorm', 'prisma', etc.)
   * @returns {IDatabaseMapper} implementation
   * @throws {InfrastructureError} if driver is not supported
   *
   * @example
   * ```typescript
   * const databaseMapperService = await DatabaseMapperServiceFactory.create();
   * ```
   */
  static async create(): Promise<IDatabaseMapper> {
    const envDriver = process.env.DATABASE_MAPPER_DRIVER || 'mongoose';
    if (!this.isValidDatabaseMapperDriver(envDriver)) {
      throw new InfrastructureError(`Invalid database mapper driver: ${envDriver}`);
    }
    const driver: DatabaseMapperDriverType = envDriver;
    switch (driver) {
      case 'mongoose':
        return this.createMongooseService();

      case 'sequelize':
        throw new InfrastructureError('Sequelize ORM service not yet implemented');

      case 'typeorm':
        throw new InfrastructureError('TypeORM service not yet implemented');

      case 'prisma':
        throw new InfrastructureError('Prisma ORM service not yet implemented');

      default:
        throw new InfrastructureError(`Unsupported ORM driver: ${driver}`);
    }
  }
}
