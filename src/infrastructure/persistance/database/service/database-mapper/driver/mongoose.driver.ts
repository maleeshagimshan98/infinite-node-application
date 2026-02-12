/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mongoose from 'mongoose';

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
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

  async init(): Promise<void> {
    try {
      const conn = await mongoose.connect(this._config.uri, this._config.options);
      this._client = conn;
    } catch (error: unknown) {
      throw new DriverError(
        `Failed to initialize MongooseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  config(): IMongooseConfig {
    return this._config;
  }

  client(): typeof mongoose | undefined {
    return this._client;
  }

  async shutdown(): Promise<void> {
    if (this._client) {
      try {
        await this._client.disconnect();
      } catch (error: unknown) {
        throw new DriverError(
          `Failed to shutdown MongooseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
}
