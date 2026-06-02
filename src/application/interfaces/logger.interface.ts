/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from './base.interface';

export interface ILogger extends IBaseInfrastructureService {
  serviceName(): 'logger';
  singleton(): true;
  deferred(): false;

  /**
   * Log an informational message
   *
   * @param message - Log message
   * @param meta - Optional metadata object
   * @returns {void}
   */
  logInfo(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log an error message
   *
   * @param {string} message - Error message
   * @param {Record<string, unknown>} meta - Optional metadata object (can include error stack, context, etc.)
   * @returns {void}
   */
  logError(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a debug message
   *
   * @param {string} message - Debug message
   * @param {Record<string, unknown>} meta - Optional metadata object
   * @returns {void}
   */
  logDebug(message: string, meta?: Record<string, unknown>): void;
}
