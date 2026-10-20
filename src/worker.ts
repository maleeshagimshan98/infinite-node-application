/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

// Must stay the first two imports: the OpenTelemetry SDK only instruments libraries loaded after it starts.
import './app/core/config/load-env';
import './app/core/telemetry/instrumentation';

import InfiniteNodeWorker from './app/worker';
import { ShutdownManager } from './app/core/shutdown/shutdown.manager';
import { setupSignalHandlers } from './app/core/shutdown/signal-handlers';
import { setupErrorHandlers } from './app/core/shutdown/error-handlers';

try {
  const shutdownManager = new ShutdownManager({
    timeout: 15000, // 15 seconds global timeout
  });

  const worker = new InfiniteNodeWorker(shutdownManager);

  setupSignalHandlers(shutdownManager);
  setupErrorHandlers(shutdownManager);

  worker.start();
} catch (error) {
  console.error('Failed to initialize InfiniteNodeWorker:', error);
  process.exit(1);
}
