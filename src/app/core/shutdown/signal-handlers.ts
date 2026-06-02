/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ShutdownManager } from './shutdown.manager';

/**
 * Setup process signal handlers for graceful shutdown
 *
 * Handles:
 * - SIGINT: Ctrl+C in terminal
 * - SIGTERM: Docker/Kubernetes stop command
 * - SIGUSR2: tsx watch / nodemon restart
 */
export function setupSignalHandlers(shutdownManager: ShutdownManager): void {
  // SIGINT: User pressed Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n📡 Received SIGINT (Ctrl+C)');
    shutdownManager.shutdown('SIGINT');
  });

  // SIGTERM: Graceful termination (Docker, K8s)
  process.on('SIGTERM', () => {
    console.log('\n📡 Received SIGTERM');
    shutdownManager.shutdown('SIGTERM');
  });

  // SIGUSR2: tsx watch / nodemon restart
  process.on('SIGUSR2', () => {
    console.log('\n📡 Received SIGUSR2 (hot reload)');
    shutdownManager.shutdown('SIGUSR2');
  });

  // beforeExit: tsx watch on Windows may trigger this instead of SIGUSR2
  process.on('beforeExit', (code) => {
    if (!shutdownManager.isShuttingDown() && code === 0) {
      console.log('\n📡 Process beforeExit event');
      shutdownManager.shutdown('beforeExit').catch(() => {
        // Ignore errors during beforeExit
      });
    }
  });

  console.log('✅ Signal handlers registered (SIGINT, SIGTERM, SIGUSR2, beforeExit)');
}
