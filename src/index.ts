/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import InfiniteNodeApplication from './app/app';
import routes from './presentation/http/routes';
import { ShutdownManager } from './app/core/shutdown/shutdown.manager';
import { setupSignalHandlers } from './app/core/shutdown/signal-handlers';
import { setupErrorHandlers } from './app/core/shutdown/error-handlers';

try {
  // Create shutdown manager for graceful termination
  const shutdownManager = new ShutdownManager({
    timeout: 15000, // 15 seconds global timeout
  });

  // Create application with shutdown manager
  // The app will automatically register its shutdown hooks
  const app = new InfiniteNodeApplication(routes, shutdownManager);

  // Setup process-level signal and error handlers
  setupSignalHandlers(shutdownManager);
  setupErrorHandlers(shutdownManager);

  // Start the application
  app.listen();
} catch (error) {
  console.error('Failed to initialize InfiniteNodeApplication:', error);
  process.exit(1);
}
