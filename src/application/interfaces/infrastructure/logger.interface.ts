/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface ILogger extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'logger'} Always `logger`.
   */
  serviceName(): 'logger';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;

  /**
   * Log an informational message
   *
   * @param {string} message - Log message
   * @param {Record<string, unknown>} [meta] - Optional metadata object
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

  /**
   * Log a warning message
   *
   * @param {string} message - Warning message
   * @param {Record<string, unknown>} [meta] - Optional metadata object
   * @returns {void}
   */
  logWarn(message: string, meta?: Record<string, unknown>): void;
}
