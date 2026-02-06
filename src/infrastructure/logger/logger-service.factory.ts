/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type winston from 'winston';
import type { ILogger } from '@/application/interfaces/logger.interface';
import { WinstonLoggerService } from './winston/winston-logger.service';

export type LoggerDriverType = 'winston' | 'bunyan' | 'pino';

export class LoggerServiceFactory {
  /**
   * Create a logger service instance using the provided Winston driver
   *
   * @param {winston.Logger} winstonLogger - Winston logger instance from the driver layer
   * @returns {ILogger} implementation
   */
  static createWinstonLoggerService(winstonLogger: winston.Logger): ILogger {
    return new WinstonLoggerService(winstonLogger);
  }

  /**
   * Create a logger service instance based on configuration
   * Currently supports Winston only, but can be extended for other providers
   *
   * @param {LoggerDriverType} driver - Logger driver type ('winston', 'bunyan', 'pino', etc.)
   * @param {unknown} logger - Logger instance from the driver layer
   * @returns {ILogger} implementation
   * @throws {Error} if driver is not supported
   */
  static create(driver: LoggerDriverType, logger: unknown): ILogger {
    switch (driver) {
      case 'winston':
        return new WinstonLoggerService(logger as winston.Logger);

      case 'bunyan':
        throw new Error('Bunyan logger service not yet implemented');

      case 'pino':
        throw new Error('Pino logger service not yet implemented');

      default:
        throw new Error(`Unsupported logger driver: ${driver}`);
    }
  }
}
