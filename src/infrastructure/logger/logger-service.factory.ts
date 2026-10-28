/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { WinstonLoggerService } from './winston/winston-logger.service';
import { winstonDriverLoader } from './winston/driver/winston.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

/**
 * Supported logger driver types
 */
export type LoggerDriverType = 'winston' | 'bunyan' | 'pino';

/**
 * Factory class for creating logger service instances
 *
 * Provides methods to instantiate logger services with their respective drivers.
 * The factory handles driver creation, initialization, and service instantiation.
 *
 * @class LoggerServiceFactory
 *
 * @example
 * ```typescript
 * const factory = new LoggerServiceFactory();
 * const logger = await factory.create();
 * logger.logInfo('Application started');
 * ```
 */
export class LoggerServiceFactory implements IServiceFactory<ILogger> {
  /**
   * Returns the DI registration name of the service this factory builds
   *
   * @returns {'logger'} Service registration name
   */
  name(): 'logger' {
    return 'logger';
  }

  /**
   * Type guard to validate logger driver type
   * @param {unknown} value - The value to check
   * @returns {value is LoggerDriverType} True if the value is a valid logger driver type
   */
  private isValidLoggerDriver(value: unknown): value is LoggerDriverType {
    return typeof value === 'string' && ['winston', 'bunyan', 'pino'].includes(value);
  }
  /**
   * Creates a Winston logger service instance
   *
   * This method creates and initializes the WinstonDriver with configuration,
   * then constructs and returns a WinstonLoggerService with the initialized driver.
   *
   * @returns {Promise<ILogger>} A promise that resolves to an initialized Winston logger service instance
   * @throws {InfrastructureError} If driver initialization fails or Winston logger is not available
   *
   * @example
   * ```typescript
   * const factory = new LoggerServiceFactory();
   * const logger = await factory.createWinstonLoggerService();
   * logger.logInfo('Server started on port 3000');
   * logger.logError('Database connection failed', { error: err });
   * ```
   */
  async createWinstonLoggerService(): Promise<ILogger> {
    return new WinstonLoggerService(await winstonDriverLoader());
  }

  /**
   * Creates a logger service instance based on the specified type
   *
   * This is a generic factory method that routes to specific service creation methods
   * based on the logger driver type parameter.
   *
   * @returns {Promise<ILogger>} A promise that resolves to a logger service instance
   * @throws {InfrastructureError} If the logger driver type is not supported or if initialization fails
   *
   * @example
   * ```typescript
   * const factory = new LoggerServiceFactory();
   * const logger = await factory.create();
   * logger.logInfo('Using winston logger');
   * logger.logDebug('Debug mode enabled', { mode: 'development' });
   * ```
   */
  async create(): Promise<ILogger> {
    const envDriver = process.env.LOGGING_DRIVER || 'winston';
    if (!this.isValidLoggerDriver(envDriver)) {
      throw new InfrastructureError(`Invalid logger driver: ${envDriver}`, 'DRIVER_ERROR', {
        envDriver,
      });
    }
    const driver: LoggerDriverType = envDriver;
    switch (driver) {
      case 'winston':
        return await this.createWinstonLoggerService();

      case 'bunyan':
        throw new InfrastructureError('Bunyan logger service not yet implemented', 'DRIVER_ERROR', {
          driver,
        });

      case 'pino':
        throw new InfrastructureError('Pino logger service not yet implemented', 'DRIVER_ERROR', {
          driver,
        });

      default:
        throw new InfrastructureError(`Unsupported logger driver: ${driver}`, 'DRIVER_ERROR', {
          driver,
        });
    }
  }
}
