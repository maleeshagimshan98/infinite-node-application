/* eslint-disable no-console */

/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import chalk from 'chalk';

import { InfrastructureManager } from '@/infrastructure/infrastructure.manager';
import type { IInfrastructureManager } from '@/application/interfaces/infrastructure/infrastructure-manager.interface';
import type { IWorker } from '@/application/interfaces/worker.interface';

import { autoRegisterWorkerComponents, container } from './core/service.container';
import { ShutdownPriority } from './core/shutdown/shutdown-priority.enum';
import { otelSdk } from './core/telemetry/instrumentation';

import type { AwilixContainer } from 'awilix';
import type { Logger } from 'winston';
import type { ShutdownManager } from './core/shutdown/shutdown.manager';

// .env.<NODE_ENV> is loaded by src/app/core/config/load-env.ts, imported first by src/worker.ts

/**
 * InfiniteNodeWorker
 *
 * Bootstraps infrastructure and dependency injection for the worker process,
 * then initializes all registered IWorker instances so they begin consuming
 * jobs from their respective queues.
 *
 * This class is the worker-process counterpart to InfiniteNodeApplication.
 * It intentionally has no HTTP server, Express middleware, or routes.
 *
 * Startup sequence:
 *   1. InfrastructureManager.init() — boots DB, queue, logger, cache, etc.
 *   2. autoRegisterWorkerComponents() — loads services, repos, and workers into Awilix
 *   3. resolveWorkers() — collects all IWorker instances from the container
 *   4. worker.init() on each — registers BullMQ processors; queues begin consuming
 *
 * Shutdown sequence (via ShutdownManager hooks):
 *   ShutdownPriority.HIGH   — worker.shutdown() on each worker (drains in-flight jobs)
 *   ShutdownPriority.MEDIUM — infrastructureManager.shutdown() (closes DB, queue, etc.)
 *   ShutdownPriority.LOW    — otelSdk.shutdown() (flushes spans, metrics and log records)
 *
 * @example
 * ```typescript
 * const shutdownManager = new ShutdownManager({ timeout: 15000 });
 * const worker = new InfiniteNodeWorker(shutdownManager);
 * setupSignalHandlers(shutdownManager);
 * setupErrorHandlers(shutdownManager);
 * worker.start();
 * ```
 */
class InfiniteNodeWorker {
  /**
   * @type {AwilixContainer} container — shared DI container
   */
  private container: AwilixContainer;

  /**
   * @type {IInfrastructureManager} infrastructureManager
   */
  private infrastructureManager: IInfrastructureManager;

  /**
   * @type {ShutdownManager | undefined} shutdownManager
   */
  private shutdownManager: ShutdownManager | undefined;

  /**
   * @type {IWorker[]} workers — resolved worker instances
   */
  private workers: IWorker[] = [];

  constructor(shutdownManager?: ShutdownManager) {
    this.shutdownManager = shutdownManager;
    this.container = container;
    this.infrastructureManager = new InfrastructureManager();
  }

  /**
   * Start the worker process.
   *
   * Triggers the async initialization chain. Any error during init is logged
   * and the process exits with code 1.
   *
   * @returns {void}
   */
  start(): void {
    this.init().catch((error) => {
      const logger = this.container.resolve<Logger>('logger', { allowUnregistered: true });
      if (logger && typeof logger.error === 'function') {
        logger.error('Fatal error during worker initialization', { error });
      }
      console.error(chalk.red('Fatal error during worker startup:'), error);
      process.exit(1);
    });
  }

  /**
   * Initialize infrastructure, DI container, and all workers.
   *
   * @returns {Promise<void>}
   * @private
   */
  private async init(): Promise<void> {
    const serviceName = process.env.APP_NAME;
    console.log(chalk.cyan(`\n⚙  Starting ${serviceName} Worker Process...`));

    await this.infrastructureManager.initForWorker(this.container);

    autoRegisterWorkerComponents();

    this.workers = this.resolveWorkers();

    if (this.workers.length === 0) {
      console.warn(chalk.yellow('  ⚠  No workers found. Ensure worker files match the pattern:'));
      console.warn(chalk.yellow('     src/application/workers/**/*.worker.{ts,js}'));
    }

    for (const worker of this.workers) {
      await worker.init();
      console.log(chalk.green(`  ✓ Worker started: ${worker.workerName()}`));
    }

    if (this.shutdownManager) {
      this.registerShutdownHooks();
    }

    console.log(chalk.cyan(`\n✅ ${serviceName} Worker Process running — ${this.workers.length} worker(s) active\n`));
  }

  /**
   * Resolve all IWorker instances from the Awilix container.
   *
   * Discovers workers by inspecting every registered name that ends with 'Worker'
   * and checking that the resolved value implements the IWorker interface.
   *
   * @returns {IWorker[]}
   * @private
   */
  private resolveWorkers(): IWorker[] {
    const workers: IWorker[] = [];
    const registrations = this.container.registrations;

    for (const name of Object.keys(registrations)) {
      if (!name.endsWith('Worker')) {
        continue;
      }

      try {
        const instance = this.container.resolve<unknown>(name, { allowUnregistered: false });
        if (this.isWorker(instance)) {
          workers.push(instance);
        }
      } catch (err) {
        console.warn(chalk.yellow(`  ⚠  Could not resolve worker '${name}': ${(err as Error).message}`));
      }
    }

    return workers;
  }

  /**
   * Type guard — checks that a resolved value implements IWorker.
   *
   * @param {unknown} value
   * @returns {value is IWorker}
   * @private
   */
  private isWorker(value: unknown): value is IWorker {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IWorker).workerName === 'function' &&
      typeof (value as IWorker).init === 'function' &&
      typeof (value as IWorker).shutdown === 'function'
    );
  }

  /**
   * Shutdown all running workers gracefully.
   *
   * Calls shutdown() on each worker concurrently and waits for all to settle.
   * Errors from individual workers are logged but do not prevent others from shutting down.
   *
   * @returns {Promise<void>}
   */
  async shutdownWorkers(): Promise<void> {
    console.log('  Shutting down workers...');

    const results = await Promise.allSettled(this.workers.map((w) => w.shutdown()));

    results.forEach((result, index) => {
      const name = this.workers[index]?.workerName() ?? `worker[${index}]`;
      if (result.status === 'rejected') {
        console.error(`  ✗ Worker '${name}' shutdown failed:`, result.reason);
      } else {
        console.log(`  ✓ Worker '${name}' shutdown complete`);
      }
    });
  }

  /**
   * Shutdown infrastructure services.
   *
   * @returns {Promise<void>}
   */
  async shutdownInfrastructure(): Promise<void> {
    console.log('  Shutting down infrastructure services...');
    if (this.infrastructureManager) {
      await this.infrastructureManager.shutdown();
    }
  }

  /**
   * Register shutdown hooks with the ShutdownManager.
   *
   * Priority order:
   *   HIGH   (2) — stop workers first; drains in-flight BullMQ jobs
   *   MEDIUM (3) — then disconnect infrastructure (DB, queue, cache)
   *   LOW    (4) — finally flush telemetry
   *
   * @private
   */
  private registerShutdownHooks(): void {
    if (!this.shutdownManager) {
      return;
    }

    this.shutdownManager.registerHook({
      name: 'workers',
      priority: ShutdownPriority.HIGH,
      timeout: 10000,
      handler: async () => {
        await this.shutdownWorkers();
      },
    });

    this.shutdownManager.registerHook({
      name: 'infrastructure-services',
      priority: ShutdownPriority.MEDIUM,
      timeout: 8000,
      handler: async () => {
        await this.shutdownInfrastructure();
      },
    });

    this.shutdownManager.registerHook({
      name: 'telemetry',
      priority: ShutdownPriority.LOW,
      timeout: 2000,
      handler: () => otelSdk.shutdown(),
    });
  }
}

export default InfiniteNodeWorker;
