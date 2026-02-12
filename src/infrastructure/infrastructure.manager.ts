/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asClass, asValue } from 'awilix';

import type { IBaseInfrastructureService } from '@/application/interfaces/base.interface';

import { infrastructureLoader } from './infrastructure.loader';

import type { AwilixContainer } from 'awilix';

export type onServiceCreatedCallback = (service: IBaseInfrastructureService) => void;

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
  private async serviceCreated(
    service: IBaseInfrastructureService,
    onServiceCreated?: onServiceCreatedCallback,
  ): Promise<void> {
    if (onServiceCreated) {
      onServiceCreated(service);
    }
  }

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
   * const manager = new InfrastructureManager();
   * await manager.init(container);
   * ```
   */
  async init(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void> {
    for (const FactoryClass of infrastructureLoader) {
      const factory = new FactoryClass();
      const service: IBaseInfrastructureService = await factory.create();
      const serviceName = service.serviceName();

      const isSingleton = service.singleton();
      if (isSingleton) {
        container.register({
          [serviceName]: asValue(service),
        });
        this.serviceCreated(service, onServiceCreated);
        continue;
      } else {
        container.register({
          [serviceName]: asClass(FactoryClass),
        });
        this.serviceCreated(service, onServiceCreated);
      }
    }
  }
}
