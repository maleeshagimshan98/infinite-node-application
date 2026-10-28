/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

import type { AwilixContainer } from 'awilix';

/**
 * Invoked once per infrastructure service, in build order, after every service has been registered and resolved.
 */
export type onServiceCreatedCallback = (service: IBaseInfrastructureService) => void;

/**
 * IInfrastructureManager — Contract for booting and shutting down the infrastructure services
 *
 * Implemented by InfrastructureManager (src/infrastructure/infrastructure.manager.ts).
 * InfiniteNodeApplication and InfiniteNodeWorker hold the manager through this interface.
 *
 * Lifecycle:
 *   1. init() (application) or initForWorker() (worker) registers every infrastructure service in the DI
 *      container under its factory's name(), then resolves them all — a service built from a closure gets the
 *      infrastructure services it depends on injected by name — and registers `healthCheck`
 *   2. Only once every service has resolved are they added to the health check and tracked for shutdown, in the
 *      order they were built
 *   3. On shutdown, shutdown() closes the services in reverse build order: dependents before their dependencies
 */
export interface IInfrastructureManager {
  /**
   * Initialize all infrastructure services and register them in the DI container.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked for each service once all are
   * built
   * @returns {Promise<void>}
   * @throws {Error} If any service initialization fails, a dependency is missing, or a service does not match its
   * factory's name()
   */
  init(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void>;

  /**
   * Initialize the infrastructure services a worker needs (all but the socket service) and register them in the
   * DI container. A service that depends on the socket service fails here.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked for each service once all are
   * built
   * @returns {Promise<void>}
   * @throws {Error} If any service initialization fails, a dependency is missing, or a service does not match its
   * factory's name()
   */
  initForWorker(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void>;

  /**
   * Gracefully shut down all infrastructure services, in reverse build order: dependents before their dependencies.
   *
   * @returns {Promise<void>}
   */
  shutdown(): Promise<void>;
}
