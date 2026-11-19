/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface IDatabase extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'database'} Always `database`.
   */
  serviceName(): 'database';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;
  /**
   * Connect to the database.
   *
   * @param {string} uri - The connection string.
   * @param {unknown} [options] - Driver-specific connection options.
   * @returns {Promise<unknown>} The driver's connection.
   */
  connection(uri: string, options?: unknown): Promise<unknown>;
  /**
   * Run `callback` inside a database transaction.
   *
   * @param {() => Promise<unknown>} callback - The operations to run in the transaction.
   * @returns {Promise<unknown>} The value `callback` resolves to.
   */
  withTransaction(callback: () => Promise<unknown>): Promise<unknown>;
}
