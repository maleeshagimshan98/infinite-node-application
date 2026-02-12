/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ILogger } from '@/application/interfaces/logger.interface';

import type winston from 'winston';
import type { WinstonDriver } from './driver/winston.driver';

/**
 * Winston Logger Service Implementation
 *
 * Provides logging functionality using the Winston logging library.
 * Implements the ILogger interface with methods for info, error, and debug logging.
 * Manages the Winston driver and provides access to the underlying logger instance.
 *
 * @class WinstonLoggerService
 * @implements {ILogger}
 *
 * @example
 * ```typescript
 * const driver = new WinstonDriver();
 * await driver.init(container, config);
 * const loggerService = new WinstonLoggerService(driver);
 *
 * loggerService.logInfo('Application started');
 * loggerService.logError('An error occurred', { errorCode: 500 });
 * loggerService.logDebug('Debug information', { userId: '123' });
 * ```
 */
export class WinstonLoggerService implements ILogger {
  /**
   * Winston driver instance
   * @private
   * @readonly
   */
  private readonly driver: WinstonDriver;

  /**
   * Winston logger instance from the driver
   * @private
   * @readonly
   */
  private readonly winstonLogger: winston.Logger;

  /**
   * Creates an instance of WinstonLoggerService
   *
   * @param {WinstonDriver} driver - Initialized Winston driver instance
   * @throws {Error} If driver is not initialized or Winston logger is not available
   *
   * @example
   * ```typescript
   * const driver = new WinstonDriver();
   * await driver.init(container, config);
   * const service = new WinstonLoggerService(driver);
   * ```
   */
  constructor(driver: WinstonDriver) {
    this.driver = driver;
    const logger = this.driver.client();
    if (!logger) {
      throw new Error('Winston logger is not initialized in the driver');
    }
    this.winstonLogger = logger;
  }

  /**
   * Get the service name for this logger implementation
   *
   * @returns {'logger'} The service name identifier
   */
  serviceName(): 'logger' {
    return 'logger';
  }

  /**
   * Indicates that this logger service should be registered as a singleton in the DI container
   *
   * @returns {false} Always returns false for non-singleton services
   */
  singleton(): false {
    return false;
  }

  /**
   * Indicates whether this logger service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  /**
   * Returns the underlying Winston driver instance
   *
   * @returns {WinstonDriver} The Winston driver
   *
   * @example
   * ```typescript
   * const driver = service.getDriver();
   * const rawLogger = driver.driver();
   * ```
   */
  getDriver(): WinstonDriver {
    return this.driver;
  }

  /**
   * Log an informational message
   *
   * @param {string} message - Log message
   * @param {Record<string, unknown>} [meta] - Optional metadata object
   * @returns {void}
   */
  logInfo(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.info(message, meta);
  }

  /**
   * Log an error message
   *
   * @param {string} message - Error message
   * @param {Record<string, unknown>} [meta] - Optional metadata object (can include error stack, context, etc.)
   * @returns {void}
   */
  logError(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.error(message, meta);
  }

  /**
   * Log a debug message
   *
   * @param {string} message - Debug message
   * @param {Record<string, unknown>} meta - Optional metadata object
   * @returns {void}
   */
  logDebug(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, meta);
  }
}
