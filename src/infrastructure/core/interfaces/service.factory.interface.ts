/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

import type { FunctionReturning } from 'awilix';

/**
 * Builds an infrastructure service from other infrastructure services.
 *
 * Each parameter is named after the registration name of the service it needs (`queue`, `logger`, …): the
 * InfrastructureManager registers the closure with Awilix CLASSIC injection, which resolves the parameters by name.
 * The closure must be synchronous — Awilix registers whatever it returns, so a returned Promise would reach every
 * consumer. Do the async driver setup in `create()` before returning the closure.
 *
 * @template T - The type of service the closure builds.
 */
export type ServiceClosure<T> = FunctionReturning<T>;

/**
 * Generic interface for a service factory that creates instances of a specific type T.
 *
 * @template T - The type of service that the factory creates.
 */
export interface IServiceFactory<T extends IBaseInfrastructureService> {
  /**
   * The DI registration name of the service this factory builds. Must equal the service's `serviceName()`.
   */
  name(): ReturnType<T['serviceName']>;

  /**
   * Create the service, or a closure that builds it from the infrastructure services it depends on.
   */
  create(): Promise<T | ServiceClosure<T>>;
}
