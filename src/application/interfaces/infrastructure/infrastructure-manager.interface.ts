/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

import type { AwilixContainer } from 'awilix';

export type onServiceCreatedCallback = (service: IBaseInfrastructureService) => void;

/**
 * IInfrastructureManager — Contract for booting and shutting down the infrastructure services
 *
 * Implemented by InfrastructureManager (src/infrastructure/infrastructure.manager.ts).
 * InfiniteNodeApplication and InfiniteNodeWorker hold the manager through this interface.
 *
 * Lifecycle:
 *   1. init() (application) or initForWorker() (worker) creates every infrastructure service and
 *      registers the singletons, plus `healthCheck`, in the DI container
 *   2. On shutdown, shutdown() closes the services in reverse order of initialization
 */
export interface IInfrastructureManager {
  /**
   * Initialize all infrastructure services and register them in the DI container.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked after each service is created
   * @returns {Promise<void>}
   * @throws {Error} If any service initialization fails
   */
  init(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void>;

  /**
   * Initialize the infrastructure services a worker needs (all but the socket service) and register them in the
   * DI container.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked after each service is created
   * @returns {Promise<void>}
   * @throws {Error} If any service initialization fails
   */
  initForWorker(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void>;

  /**
   * Gracefully shut down all infrastructure services, in reverse order of initialization.
   *
   * @returns {Promise<void>}
   */
  shutdown(): Promise<void>;
}
