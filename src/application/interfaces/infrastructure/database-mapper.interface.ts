/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export type TransactionOptions = {
  session?: unknown; // The session object type depends on the underlying database mapper (e.g., Mongoose ClientSession, Sequelize Transaction, etc.)
};

/**
 * Database Mapper (Object-Relational Mapping/ Object-Document Mapping) Interface
 *
 * Defines the contract for database mapping service implementations.
 * Database mappers provide an abstraction layer for database operations using object-oriented paradigms.
 */
export interface IDatabaseMapper extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'database_mapper'} Always `database_mapper`.
   */
  serviceName(): 'database_mapper';
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
   * Provides access to the underlying database mapper client/instance for performing database operations
   *
   * @returns {unknown} The underlying database mapper client/instance (e.g., Mongoose connection, Sequelize instance, etc.)
   * @throws {InfrastructureError} DATABASE_ERROR when the service is not initialized.
   */
  mapper(): unknown;

  /**
   * Executes a series of database operations within a transaction, if supported by the underlying mapper.
   * Errors thrown by the callback itself are rethrown unchanged.
   *
   * @param {(options: TransactionOptions) => Promise<T>} callback - An asynchronous function containing the database operations to execute within the transaction
   * @returns {Promise<T>} The result of the transaction callback
   * @throws {PersistanceError} If the underlying mapper/driver fails (e.g. transactions unsupported, commit or connection failure)
   */
  transaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T>;
}
