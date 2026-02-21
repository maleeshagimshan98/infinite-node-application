/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asClass, asValue } from 'awilix';

import type { IBaseInfrastructureService } from '@/application/interfaces/base.interface';

import { InfrastructureHealthCheckService } from './health/infrastructure-health-check.service';
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
 * const healthCheck = container.resolve<IHealthCheck>('healthCheck');
 * ```
 */
export class InfrastructureManager {
  private healthCheckService: InfrastructureHealthCheckService;

  constructor() {
    this.healthCheckService = new InfrastructureHealthCheckService();
  }

  /**
   * Handles post-creation tasks for a service
   *
   * Registers the service with the health check service and invokes
   * the optional callback if provided.
   *
   * @param {IBaseInfrastructureService} service - The newly created service instance
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback to invoke after service creation
   * @returns {Promise<void>}
   * @private
   */
  private async serviceCreated(
    service: IBaseInfrastructureService,
    onServiceCreated?: onServiceCreatedCallback,
  ): Promise<void> {
    // Register service with health check service
    this.healthCheckService.registerService(service);

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
        await this.serviceCreated(service, onServiceCreated);
        continue;
      }
    }

    // Register health check service
    container.register({
      healthCheck: asValue(this.healthCheckService),
    });
  }
}
