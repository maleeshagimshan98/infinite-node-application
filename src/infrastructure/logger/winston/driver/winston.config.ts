/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

/**
 * Winston Logger Configuration Interface
 *
 * Defines the configuration structure for Winston logger driver.
 * Includes settings for file rotation, log levels, transports, and formats.
 *
 * @interface IWinstonConfig
 * @extends {IDriverConfig}
 */
export interface IWinstonConfig extends IDriverConfig {
  /**
   * Winston-specific configuration parameters
   */
  winston: {
    /**
     * Log file name pattern (supports date patterns like %DATE%)
     * @example './logs/application-%DATE%.log'
     */
    fileName: string;

    /**
     * Date pattern for log file rotation
     * @example 'YYYY-MM-DD'
     */
    datePattern: string;

    /**
     * Whether to compress (gzip) archived log files
     */
    zippedArchive: boolean;

    /**
     * Maximum size per log file (in bytes)
     * @example 5242880 (5MB)
     */
    maxSize: number;

    /**
     * Maximum number of log files to retain
     */
    maxFiles: number;

    /**
     * Default log level
     * @example 'info', 'debug', 'error', 'warn'
     */
    level: string;

    /**
     * Default log format
     * @example 'json', 'simple'
     */
    format: string;

    /**
     * Transport configurations
     * Defines where and how logs should be output (console, file, etc.)
     */
    transports: Array<{
      /**
       * Transport type
       * @example 'console', 'file'
       */
      type: string;

      /**
       * Transport-specific options
       */
      options: {
        /**
         * Log level for this transport
         */
        level?: string;

        /**
         * Format for this transport
         */
        format?: string;

        /**
         * File path for file transports
         */
        filename?: string;
      };
    }>;
  };
}

/**
 * Creates and returns Winston logger configuration
 *
 * Loads configuration from environment variables with sensible defaults.
 * Sets up console and file transports with appropriate log levels and formats.
 *
 * @returns {IWinstonConfig} The Winston logger configuration object
 *
 * @example
 * ```typescript
 * const config = winstonConfig();
 * const driver = new WinstonDriver();
 * await driver.init(container, config);
 * ```
 *
 * @remarks
 * Environment variables:
 * - WINSTON_LOG_FILE_NAME: Application log file pattern
 * - WINSTON_ERROR_LOG_FILE_NAME: Error log file pattern
 * - WINSTON_LOG_DATE_PATTERN: Date pattern for file rotation
 * - WINSTON_LOG_ZIPPED_ARCHIVE: Whether to compress archived logs
 * - WINSTON_LOG_MAX_SIZE: Maximum size per log file in bytes
 * - WINSTON_LOG_MAX_FILES: Maximum number of log files to retain
 * - WINSTON_LOG_LEVEL: Default log level
 * - WINSTON_LOG_FORMAT: Default log format
 */
export const winstonConfig = (): IWinstonConfig => {
  const applicationLogFileName = process.env.WINSTON_LOG_FILE_NAME || './logs/application-%DATE%.log';
  const errorLogFileName = process.env.WINSTON_ERROR_LOG_FILE_NAME || './logs/error-%DATE%.log';

  return {
    driverName: 'logger',
    singleton: true,
    deferred: true,
    winston: {
      fileName: applicationLogFileName,
      datePattern: process.env.WINSTON_LOG_DATE_PATTERN || 'YYYY-MM-DD',
      zippedArchive: process.env.WINSTON_LOG_ZIPPED_ARCHIVE === 'true',
      maxSize: Number(process.env.WINSTON_LOG_MAX_SIZE) || 5242880, // 5MB default
      maxFiles: Number(process.env.WINSTON_LOG_MAX_FILES) || 5,
      level: process.env.WINSTON_LOG_LEVEL || 'info',
      format: process.env.WINSTON_LOG_FORMAT || 'json',
      transports: [
        {
          type: 'console',
          options: { level: 'info', format: 'simple' },
        },
        {
          type: 'file',
          options: { filename: applicationLogFileName, level: 'info', format: 'json' },
        },
        {
          type: 'file',
          options: { filename: errorLogFileName, level: 'error', format: 'json' },
        },
      ],
    },
  };
};
