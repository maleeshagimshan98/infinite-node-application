/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type {
  IDatabaseMapper,
  TransactionOptions,
} from '@/application/interfaces/infrastructure/database-mapper.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { isConnectionFailure, isMongooseDriverError } from '../../errors/mongoose-error.guards';
import { PersistanceError } from '../../errors/persistance.error';

import type { Connection } from 'mongoose';
import type mongoose from 'mongoose';
import type { MongooseDriver } from './driver/mongoose.driver';

/**
 * Mongoose ORM Service Implementation
 *
 * Provides Mongoose ODM (Object Document Mapper) functionality for MongoDB.
 * Manages the connection lifecycle and error handling.
 *
 * @implements {IDatabaseMapper}
 *
 * @example
 * ```typescript
 * const mongooseService = new MongooseService();
 * await mongooseService.init();
 * ```
 */
export class MongooseService implements IDatabaseMapper {
  /**
   * The configuration used to initialize the Mongoose connection
   *
   * @type {MongooseDriver}
   */
  private driver: MongooseDriver;

  /**
   * The underlying Mongoose client/instance used for database operations
   *
   * @type {mongoose.Mongoose}
   */
  private client: mongoose.Mongoose;

  constructor(driver: MongooseDriver) {
    this.driver = driver;
    const client = driver.client();
    if (!client) {
      throw new PersistanceError('Invalid Mongoose client provided to MongooseService');
    }
    this.client = client;
  }

  /**
   * Get the service name for this database mapper implementation
   *
   * @returns {'database_mapper'} The service name identifier
   */
  serviceName(): 'database_mapper' {
    return 'database_mapper';
  }

  /**
   * Indicates that this database mapper service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this database mapper service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  /**
   * Provides access to the underlying Mongoose client/instance
   *
   * @returns {MongooseDriver} The underlying Mongoose driver
   * @throws {PersistanceError} If the service is not initialized
   */
  getDriver(): MongooseDriver {
    return this.driver;
  }

  /**
   * Provides access to the underlying Mongoose client/instance for performing database operations
   *
   * @returns {mongoose.Mongoose} The underlying Mongoose client/instance
   * @throws {PersistanceError} If the service is not initialized
   */
  mapper(): mongoose.Mongoose {
    return this.client;
  }

  /**
   * Executes a series of database operations within a transaction, if supported by the underlying mapper.
   * Errors thrown by the callback (domain, entity, repository or other infrastructure errors) are rethrown
   * unchanged; only Mongoose / MongoDB driver errors are translated.
   *
   * @param {(options: TransactionOptions) => Promise<T>} callback - An asynchronous function containing the database operations to execute within the transaction
   * @returns {Promise<T>} The result of the transaction callback
   * @throws {InfrastructureError} CONNECTION_ERROR if the database cannot be reached
   * @throws {PersistanceError} If Mongoose or the MongoDB driver otherwise fails while running, committing or aborting the transaction
   */
  async transaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T> {
    const connection: Connection = this.client.connection;
    try {
      return await connection.transaction((session) => {
        return callback({ session });
      });
    } catch (err: unknown) {
      // Translate only here, after withTransaction has finished: it retries on TransientTransactionError
      // only while the raw MongoError is still unwrapped inside the callback.
      if (!isMongooseDriverError(err)) {
        throw err;
      }
      const message = `Failed to execute transaction: ${err.message}`;
      if (isConnectionFailure(err, connection.readyState)) {
        throw new InfrastructureError(message, 'CONNECTION_ERROR', { cause: err });
      }
      throw new PersistanceError(message, { cause: err });
    }
  }

  /**
   * Gracefully shutdown the MongoDB connection
   *
   * @returns {Promise<void>}
   * @throws {PersistanceError} If the MongoDB connection fails to close
   */
  async shutdown(): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.connection.close();
      console.log('  MongoDB connection closed');
    } catch (err: unknown) {
      throw new PersistanceError(
        `Failed to close MongoDB connection: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }
}
