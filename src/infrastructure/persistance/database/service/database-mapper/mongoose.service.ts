/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDatabaseMapper, TransactionOptions } from '@/application/interfaces/database-mapper.interface';
import { IMongooseConfig } from '@/app/core/config/drivers/mongoose.config';
import mongoose, { Connection } from 'mongoose';
import { PersistanceError } from '../../erros/persistance.error';

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
 * await mongooseService.init({
 *   uri: 'mongodb://localhost:27017/mydb',
 *   options: { useNewUrlParser: true }
 * });
 * ```
 */
export class MongooseService implements IDatabaseMapper {
  private client: mongoose.Mongoose | undefined;

  /**
   * Initializes the Mongoose connection with the provided configuration
   *
   * @param {IMongooseConfig | unknown} config - Mongoose configuration with URI and options
   * @returns {Promise<void>}
   * @throws {PersistanceError} If connection fails or encounters errors
   *
   * @example
   * ```typescript
   * await mongooseService.init({
   *   uri: 'mongodb://localhost:27017/mydb',
   *   options: { useNewUrlParser: true, useUnifiedTopology: true }
   * });
   * ```
   */
  async init(config: IMongooseConfig | unknown): Promise<void> {
    const mongooseConfig = config as IMongooseConfig;
    try {
      const conn = await mongoose.connect(mongooseConfig.uri, mongooseConfig.options);
      this.client = conn;
      if (this.client.connection.readyState !== 1) {
        throw new PersistanceError(`Mongoose not connected. State: ${this.client.connection.readyState}`);
      }
      this.client.connection.on('error', (err) => {
        throw new PersistanceError(`Mongoose connection error: ${err instanceof Error ? err.message : String(err)}`);
      });
    } catch (err: unknown) {
      throw new PersistanceError(
        `Failed to initialize MongooseService: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Provides access to the underlying Mongoose client/instance for performing database operations
   *
   * @returns {mongoose.Mongoose} The underlying Mongoose client/instance
   * @throws {PersistanceError} If the service is not initialized
   */
  mapper(): mongoose.Mongoose {
    if (!this.client) {
      throw new PersistanceError('MongooseService not initialized. Call init() before accessing the mapper.');
    }
    return this.client;
  }

  /**
   * Executes a series of database operations within a transaction, if supported by the underlying mapper
   *
   * @param {(options: TransactionOptions) => Promise<unknown>} callback - An asynchronous function containing the database operations to execute within the transaction
   * @returns {Promise<unknown>} The result of the transaction callback
   * @throws {PersistanceError} If the service is not initialized or the transaction fails
   */
  async transaction(callback: (options: TransactionOptions) => Promise<unknown>): Promise<unknown> {
    if (!this.client) {
      throw new PersistanceError('MongooseService not initialized. Call init() before executing transactions.');
    }
    const connection: Connection = this.client.connection;
    return connection.transaction(async (session) => {
      try {
        return await callback({ session });
      } catch (err: unknown) {
        throw new PersistanceError(`Transaction failed: ${err instanceof Error ? err.message : 'Unknown error'}`, {
          cause: err,
        });
      } finally {
        await session.endSession();
      }
    });
  }
}
