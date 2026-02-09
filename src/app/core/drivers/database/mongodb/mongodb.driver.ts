/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MongoClient } from 'mongodb';
import type { ICoreDriver } from '../../core.driver';
import type { IMongoDBConfig } from '../../../config/drivers/mongodb.config';
import type { AwilixContainer } from 'awilix';

export class MongoDBDriver implements ICoreDriver<MongoClient, IMongoDBConfig> {
  private client: MongoClient | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: IMongoDBConfig): Promise<void> {
    const client = await new MongoClient(config.uri).connect();
    client.on('error', (err: Error) => {
      throw new Error('MongoDB Client Error', err);
    });
    this.client = client;
  }

  driver(): MongoClient | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}
