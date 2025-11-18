/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MongoClient } from 'mongodb';
import type { ICoreService } from '../../core.service';
import type { IMongoDBConfig } from '../../../config/service/mongodb.config';
import type { AwilixContainer } from 'awilix';

export class MongoDBService implements ICoreService<IMongoDBConfig> {
  private client: MongoClient | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: IMongoDBConfig): Promise<void> {
    const client = await new MongoClient(config.uri).connect();
    client.on('error', (err: Error) => {
      throw new Error('MongoDB Client Error', err);
    });
    this.client = client;
  }

  service(): MongoClient | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}
