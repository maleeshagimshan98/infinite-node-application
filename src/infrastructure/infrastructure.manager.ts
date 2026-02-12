/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asValue } from 'awilix';

import type { IBaseInfrastructureService } from '@/application/interfaces/base.interface';

import { infrastructureLoader } from './infrastructure.loader';

import type { AwilixContainer } from 'awilix';

/**
 * Infrastructure Manager
 *
 * Manages the initialization and registration of all infrastructure services
 * in the dependency injection container.
 *
 * @class InfrastructureManager
 *
 * @example
 * ```typescript
 * const container = createContainer();
 * const manager = new InfrastructureManager();
 * await manager.init(container);
 *
 * // Now all infrastructure services are registered and ready to use
 * const cache = container.resolve<ICache>('cache');
 * const logger = container.resolve<ILogger>('logger');
 * ```
 */
export class InfrastructureManager {
  /**
   * Initializes all infrastructure services and registers them in the DI container
   *
   * Iterates through all service loaders, instantiates each service,
   * and registers them using their declared service names.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @returns {Promise<void>}
   * @throws {Error} If any service initialization fails
   *
   * @example
   * ```typescript
   * const container = createContainer();
   * const manager = new InfrastructureManager();
   * await manager.init(container);
   * ```
   */
  async init(container: AwilixContainer): Promise<void> {
    // Iterate through each infrastructure service loader
    for (const [key, loaderFn] of Object.entries(infrastructureLoader)) {
      // Call the loader function to instantiate the service
      const service: IBaseInfrastructureService = await loaderFn();

      // Get the service name for container registration
      const serviceName = service.serviceName();

      // Check if service should be singleton
      const isSingleton = service.singleton();

      // Register the service in the container
      // Using asValue since services are already instantiated
      container.register({
        [serviceName]: asValue(service),
      });
    }
  }
}
