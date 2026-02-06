/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type winston from 'winston';
import type { ILogger } from '../../../application/interfaces/logger.interface';

export class WinstonLoggerService implements ILogger {
  /**
   * Creates an instance of WinstonLoggerService
   *
   * @param {winston.Logger} winstonLogger - Winston logger instance from the driver layer
   */
  constructor(private readonly winstonLogger: winston.Logger) {}

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
