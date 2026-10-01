/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mongoose from 'mongoose';

import type { ICoreDriver, IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import type { IMongooseConfig } from './mongoose.config';

export class MongooseDriver implements ICoreDriver<typeof mongoose, IMongooseConfig> {
  /**
   * _config holds the configuration for the MongoDB connection, including the URI and any connection options.
   *
   * @type {IMongooseConfig} _config - The configuration for the MongoDB connection, including URI and options.
   */
  private _config: IMongooseConfig;

  /**
   * client is the instance of Mongoose that will be used to interact with the MongoDB database.
   *
   * @type {typeof mongoose | undefined} _client - The Mongoose client instance, initialized in the init method.
   */
  private _client: typeof mongoose | undefined;

  constructor(config: IMongooseConfig) {
    this._config = config;
  }

  /**
   * Connect Mongoose to the configured MongoDB URI.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} If the connection cannot be established
   */
  async init(): Promise<void> {
    try {
      const conn = await mongoose.connect(this._config.uri, this._config.options);
      this._client = conn;
    } catch (error: unknown) {
      throw new DriverError(
        `Failed to initialize MongooseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  config(): IMongooseConfig {
    return this._config;
  }

  client(): typeof mongoose | undefined {
    return this._client;
  }

  /**
   * Disconnect Mongoose from MongoDB.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} If the connection fails to close
   */
  async shutdown(): Promise<void> {
    if (this._client) {
      try {
        await this._client.disconnect();
      } catch (error: unknown) {
        throw new DriverError(
          `Failed to shutdown MongooseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined,
        );
      }
    }
  }

  /**
   * Check MongoDB connection health
   *
   * @returns {Promise<IDriverHealthStatus>} Health status including connection state and latency
   */
  async health(): Promise<IDriverHealthStatus> {
    try {
      if (!this._client) {
        return {
          connected: false,
          error: 'MongoDB client not initialized',
        };
      }

      // Check connection state (1 = connected)
      if (this._client.connection.readyState !== 1) {
        return {
          connected: false,
          error: 'MongoDB not connected',
        };
      }

      // Ping the database and measure latency
      const start = process.hrtime.bigint();
      await this._client.connection.db?.admin().ping();
      const end = process.hrtime.bigint();
      const latency = Number((end - start) / BigInt(1000000)); // ns -> ms

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
