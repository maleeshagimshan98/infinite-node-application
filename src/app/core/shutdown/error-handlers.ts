/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ShutdownManager } from './shutdown.manager';
import type { Logger } from 'winston';

/**
 * Setup handlers for unhandled errors
 *
 * Handles:
 * - unhandledRejection: Promise rejections without .catch()
 * - uncaughtException: Synchronous errors not in try/catch
 */
export function setupErrorHandlers(shutdownManager: ShutdownManager, logger?: Logger): void {
  // Unhandled Promise Rejection
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const errorMessage = reason instanceof Error ? reason.message : String(reason);

    console.error('\n❌ Unhandled Promise Rejection:', errorMessage);

    if (logger) {
      logger.error('Unhandled Promise Rejection', {
        reason,
        promise: String(promise),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    }

    // Initiate graceful shutdown
    shutdownManager.shutdown('unhandledRejection');
  });

  // Uncaught Exception (fail-fast)
  process.on('uncaughtException', (error: Error) => {
    console.error('\n❌ Uncaught Exception:', error.message);
    console.error(error.stack);

    if (logger) {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
    }

    // Force exit immediately (cannot recover)
    shutdownManager.forceExit(1);
  });

  console.log('✅ Error handlers registered (unhandledRejection, uncaughtException)');
}
