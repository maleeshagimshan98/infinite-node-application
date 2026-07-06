/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from './base-infrastructure-service.interface';

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
  serviceName(): 'database_mapper';
  singleton(): true;
  deferred(): false;

  /**
   * Provides access to the underlying database mapper client/instance for performing database operations
   *
   * @returns {unknown} The underlying database mapper client/instance (e.g., Mongoose connection, Sequelize instance, etc.)
   */
  mapper(): unknown;

  /**
   * Executes a series of database operations within a transaction, if supported by the underlying mapper
   *
   * @param {(options: TransactionOptions) => Promise<T>} callback - An asynchronous function containing the database operations to execute within the transaction
   * @returns {Promise<T>} The result of the transaction callback
   * @throws {PersistanceError} If the underlying mapper does not support transactions or if the transaction fails
   */
  transaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T>;
}
