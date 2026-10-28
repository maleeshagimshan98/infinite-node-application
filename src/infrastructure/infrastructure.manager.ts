/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asValue } from 'awilix';

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';
import type {
  IInfrastructureManager,
  onServiceCreatedCallback,
} from '@/application/interfaces/infrastructure/infrastructure-manager.interface';

import { InfrastructureHealthCheckService } from './health/infrastructure-health-check.service';
import { infrastructureLoader } from './infrastructure.loader';

import type { InfrastructureFactoryClass } from './infrastructure.loader';
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
 * const healthCheck = container.resolve<IHealthCheck>('healthCheck');
 * ```
 */
export class InfrastructureManager implements IInfrastructureManager {
  private healthCheckService: InfrastructureHealthCheckService;
  private services: IBaseInfrastructureService[] = [];

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
   * Iterates through the given factory classes, instantiates each service,
   * and registers singletons in the DI container.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {InfrastructureFactoryClass[]} loader - Factory classes to instantiate
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked after each service is created
   * @returns {Promise<void>}
   * @private
   */
  private async loadServices(
    container: AwilixContainer,
    loader: InfrastructureFactoryClass[],
    onServiceCreated?: onServiceCreatedCallback,
  ): Promise<void> {
    for (const FactoryClass of loader) {
      const factory = new FactoryClass();
      const service: IBaseInfrastructureService = await factory.create();
      const serviceName = service.serviceName();

      const isSingleton = service.singleton();
      if (isSingleton) {
        container.register({
          [serviceName]: asValue(service),
        });
        // Track service for shutdown
        this.services.push(service);
        await this.serviceCreated(service, onServiceCreated);
        continue;
      }
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
    await this.loadServices(container, infrastructureLoader, onServiceCreated);

    // Register health check service
    container.register({
      healthCheck: asValue(this.healthCheckService),
    });
  }

  /**
   * Initializes infrastructure services for workers (excludes SocketService)
   *
   * Same as `init` but filters out the SocketService factory, since workers
   * do not require socket connections.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked after each service is created
   * @returns {Promise<void>}
   * @throws {Error} If any service initialization fails
   */
  async initForWorker(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void> {
    const { SocketServiceFactory } = await import('./socket/socket-service.factory');

    const workerLoader = infrastructureLoader.filter((FactoryClass) => FactoryClass !== SocketServiceFactory);

    await this.loadServices(container, workerLoader, onServiceCreated);

    container.register({
      healthCheck: asValue(this.healthCheckService),
    });
  }

  /**
   * Gracefully shutdown all infrastructure services
   *
   * Services are shut down in reverse order of initialization
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down infrastructure services...');

    // Shutdown in reverse order (LIFO)
    const reversedServices = [...this.services].reverse();

    for (const service of reversedServices) {
      if (typeof service.shutdown === 'function') {
        try {
          await service.shutdown();
        } catch (error) {
          console.error(`  Error shutting down ${service.serviceName()}:`, error);
        }
      }
    }
  }
}
