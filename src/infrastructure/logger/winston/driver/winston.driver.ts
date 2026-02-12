/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import winston from 'winston';

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';

import type { IWinstonConfig } from './winston.config';

import 'winston-daily-rotate-file';

/**
 * Winston Logger Driver
 *
 * Implements the Winston logger driver for application logging.
 * Configures transports (console, file, etc.) and manages the Winston logger instance lifecycle.
 * Supports daily log file rotation with configurable size limits and retention policies.
 *
 * @class WinstonDriver
 * @implements {ICoreDriver<winston.Logger, IWinstonConfig>}
 *
 * @example
 * ```typescript
 * const driver = new WinstonDriver();
 * await driver.init(container, winstonConfig());
 * const logger = driver.driver();
 * logger.info('Application started');
 *
 * // Cleanup on shutdown
 * await driver.shutdown();
 * ```
 */
export class WinstonDriver implements ICoreDriver<winston.Logger, IWinstonConfig> {
  /**
   * Winston configuration for the driver
   *
   * @type {IWinstonConfig}
   */
  private _config: IWinstonConfig;

  /**
   * Winston logger instance
   * @private
   */
  private logger: winston.Logger | undefined;

  constructor(config: IWinstonConfig) {
    this._config = config;
  }

  /**
   * Returns the Winston configuration for this driver
   *
   * @returns {IWinstonConfig} The Winston configuration object
   */
  config(): IWinstonConfig {
    return this._config;
  }

  /**
   * Initializes the Winston logger with the provided configuration
   *
   * Sets up transports based on configuration (console, file with daily rotation).
   * Configures log levels, formats, and rotation policies for file transports.
   *
   * @param {AwilixContainer} container - Awilix DI container (for potential dependencies)
   * @param {IWinstonConfig} config - Winston configuration object
   * @returns {Promise<void>}
   * @throws {Error} If logger initialization fails
   *
   * @example
   * ```typescript
   * const driver = new WinstonDriver();
   * await driver.init(container, {
   *   driverName: 'logger',
   *   singleton: true,
   *   deferred: true,
   *   winston: {
   *     level: 'info',
   *     format: 'json',
   *     transports: [
   *       { type: 'console', options: { level: 'info' } },
   *       { type: 'file', options: { filename: 'app.log' } }
   *     ]
   *   }
   * });
   * ```
   */
  async init(): Promise<void> {
    const transports: winston.transport[] = [];

    // Configure transports from config
    for (const t of this._config.winston.transports) {
      if (t.type === 'console') {
        transports.push(
          new winston.transports.Console({
            level: t.options.level ?? this._config.winston.level,
            format:
              t.options.format === 'simple'
                ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                : winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        );
      }

      if (t.type === 'file') {
        const filename = t.options.filename ?? this._config.winston.fileName;
        // Use DailyRotateFile for log rotation with date patterns
        transports.push(
          new (
            winston.transports as unknown as {
              DailyRotateFile: new (opts: unknown) => winston.transport;
            }
          ).DailyRotateFile({
            filename,
            datePattern: this._config.winston.datePattern,
            zippedArchive: this._config.winston.zippedArchive,
            maxSize: this._config.winston.maxSize,
            maxFiles: this._config.winston.maxFiles,
            level: t.options.level ?? this._config.winston.level,
            format:
              t.options.format === 'simple'
                ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                : winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }) as unknown as winston.transport,
        );
      }
    }

    // Create Winston logger with configured transports
    this.logger = winston.createLogger({
      level: this._config.winston.level,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports,
    });
  }

  /**
   * Returns the underlying Winston logger instance
   *
   * @returns {winston.Logger | undefined} The Winston logger instance, or undefined if not initialized
   *
   * @example
   * ```typescript
   * const logger = driver.driver();
   * if (logger) {
   *   logger.info('Logging from the driver');
   * }
   * ```
   */
  client(): winston.Logger | undefined {
    return this.logger;
  }

  /**
   * Shuts down the Winston logger and cleans up resources
   *
   * Closes all transports and releases file handles.
   * Should be called during application shutdown to ensure logs are flushed.
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * // On application shutdown
   * await driver.shutdown();
   * ```
   */
  async shutdown(): Promise<void> {
    if (!this.logger) return;
    this.logger.close();
    this.logger = undefined;
  }
}
