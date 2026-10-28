/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asFunction, asValue, AwilixResolutionError, Lifetime } from 'awilix';

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';
import type {
  IInfrastructureManager,
  onServiceCreatedCallback,
} from '@/application/interfaces/infrastructure/infrastructure-manager.interface';

import { InfrastructureError } from './core/errors/infrastructure.error';
import { InfrastructureHealthCheckService } from './health/infrastructure-health-check.service';
import { infrastructureLoader } from './infrastructure.loader';

import type { ServiceClosure } from './core/interfaces/service.factory.interface';
import type { InfrastructureFactoryClass } from './infrastructure.loader';
import type { AwilixContainer, Resolver } from 'awilix';

/**
 * Infrastructure Manager
 *
 * Manages the initialization and registration of all infrastructure services
 * in the dependency injection container.
 *
 * Each service is registered under its factory's `name()`. A factory returns either the service itself, or a
 * closure whose parameters name the infrastructure services it depends on. Every service is registered before any
 * is resolved, so the order of the loader does not matter. Services are shut down in reverse build order:
 * dependents before their dependencies.
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

  /**
   * @param {InfrastructureFactoryClass[]} [loader] - Factory classes to build the services from; defaults to
   * `infrastructureLoader`
   */
  constructor(private readonly loader: InfrastructureFactoryClass[] = infrastructureLoader) {
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
   * Wraps a factory's closure in a singleton resolver that records each service as Awilix builds it
   *
   * Awilix builds a closure's dependencies inside the call that builds the closure, so the recorded order lists
   * every service after the services it depends on.
   *
   * @param {ServiceClosure<IBaseInfrastructureService>} closure - The closure returned by the factory's create()
   * @param {IBaseInfrastructureService[]} built - Receives each service once it is built
   * @returns {Resolver<IBaseInfrastructureService>} A singleton resolver that injects the closure's parameters by name
   * @private
   */
  private closureResolver(
    closure: ServiceClosure<IBaseInfrastructureService>,
    built: IBaseInfrastructureService[],
  ): Resolver<IBaseInfrastructureService> {
    // CLASSIC whatever the container's mode: the closure's parameter names are its dependencies.
    const build = asFunction(closure).classic();
    return {
      lifetime: Lifetime.SINGLETON,
      resolve: (container: AwilixContainer): IBaseInfrastructureService => {
        // Called as a method: Awilix's resolve() reads the resolver's injection mode through `this`.
        const service = build.resolve(container);
        built.push(service);
        return service;
      },
    };
  }

  /**
   * Resolves a registered infrastructure service, building it and the services it depends on if it was registered
   * as a closure
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {string} name - The service's registration name
   * @returns {IBaseInfrastructureService} The resolved service
   * @throws {InfrastructureError} DRIVER_ERROR when the service depends on a service that is not registered, or
   * depends on itself through a cycle
   * @private
   */
  private resolveService(container: AwilixContainer, name: string): IBaseInfrastructureService {
    try {
      return container.resolve<IBaseInfrastructureService>(name);
    } catch (error) {
      if (error instanceof AwilixResolutionError) {
        throw new InfrastructureError(
          `Infrastructure service '${name}' could not be resolved: ${error.message}`,
          'DRIVER_ERROR',
          { service: name, cause: error },
        );
      }
      throw error;
    }
  }

  /**
   * Checks that a resolved service matches its factory's registration
   *
   * @param {IBaseInfrastructureService} service - The resolved service
   * @param {string} name - The registration name returned by its factory's name()
   * @returns {void}
   * @throws {InfrastructureError} DRIVER_ERROR when the service's serviceName() differs from name, or the service is
   * not a singleton
   * @private
   */
  private assertService(service: IBaseInfrastructureService, name: string): void {
    const serviceName = service.serviceName();
    if (serviceName !== name) {
      throw new InfrastructureError(
        `Infrastructure service registered as '${name}' reports serviceName() '${serviceName}'`,
        'DRIVER_ERROR',
        { name, serviceName },
      );
    }
    if (!service.singleton()) {
      throw new InfrastructureError(`Infrastructure service '${name}' is not a singleton`, 'DRIVER_ERROR', { name });
    }
  }

  /**
   * Creates a service from each factory class, registers them all in the DI container, then resolves them and
   * tracks them for the health check and shutdown
   *
   * A service the factory returns is registered as a value; a closure is registered as a singleton that Awilix
   * builds on first resolve, injecting its parameters by name. Services are tracked in the order they were built,
   * and only once every one of them has resolved.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {InfrastructureFactoryClass[]} loader - Factory classes to instantiate
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked for each service, in build
   * order, once all services have resolved
   * @returns {Promise<void>}
   * @throws {InfrastructureError} DRIVER_ERROR when a dependency is missing or cyclic, or a service does not match
   * its factory's name() or is not a singleton
   * @private
   */
  private async loadServices(
    container: AwilixContainer,
    loader: InfrastructureFactoryClass[],
    onServiceCreated?: onServiceCreatedCallback,
  ): Promise<void> {
    const factories = loader.map((FactoryClass) => new FactoryClass());
    // Dependencies come before the services that depend on them.
    const built: IBaseInfrastructureService[] = [];

    for (const factory of factories) {
      const created = await factory.create();
      if (typeof created === 'function') {
        container.register({ [factory.name()]: this.closureResolver(created, built) });
      } else {
        built.push(created);
        container.register({ [factory.name()]: asValue(created) });
      }
    }

    for (const factory of factories) {
      this.assertService(this.resolveService(container, factory.name()), factory.name());
    }

    for (const service of built) {
      // Track service for shutdown
      this.services.push(service);
      await this.serviceCreated(service, onServiceCreated);
    }
  }

  /**
   * Initializes all infrastructure services and registers them in the DI container
   *
   * Registers every service under its factory's name(), then resolves them all.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked for each service once all
   * are built
   * @returns {Promise<void>}
   * @throws {InfrastructureError} DRIVER_ERROR when a dependency is missing or cyclic, or a service does not match
   * its factory's name() or is not a singleton
   *
   * @example
   * ```typescript
   * const manager = new InfrastructureManager();
   * await manager.init(container);
   * ```
   */
  async init(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void> {
    await this.loadServices(container, this.loader, onServiceCreated);

    // Register health check service
    container.register({
      healthCheck: asValue(this.healthCheckService),
    });
  }

  /**
   * Initializes infrastructure services for workers (excludes SocketService)
   *
   * Same as `init` but filters out the SocketService factory, since workers
   * do not require socket connections. A service that depends on `socket` fails here.
   *
   * @param {AwilixContainer} container - The Awilix DI container
   * @param {onServiceCreatedCallback} [onServiceCreated] - Optional callback invoked for each service once all
   * are built
   * @returns {Promise<void>}
   * @throws {InfrastructureError} DRIVER_ERROR when a dependency is missing (including `socket`) or cyclic, or a
   * service does not match its factory's name() or is not a singleton
   */
  async initForWorker(container: AwilixContainer, onServiceCreated?: onServiceCreatedCallback): Promise<void> {
    const { SocketServiceFactory } = await import('./socket/socket-service.factory');

    const workerLoader = this.loader.filter((FactoryClass) => FactoryClass !== SocketServiceFactory);

    await this.loadServices(container, workerLoader, onServiceCreated);

    container.register({
      healthCheck: asValue(this.healthCheckService),
    });
  }

  /**
   * Gracefully shutdown all infrastructure services
   *
   * Services are shut down in reverse build order, so a service stops before the services it depends on
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
