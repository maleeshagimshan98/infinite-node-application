/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { IDatabaseConfig } from '../../config/service/database.config';
import type { ICoreService } from '../core.service';
import { MongoDBService } from './mongodb/mongodb.service';
import type { MongoClient } from 'mongodb';
import type { Pool } from 'mysql';
import { MySQLService } from './mysql/mysql.service';

export type DatabaseClientType = MongoClient | Pool;

export class DatabaseService implements ICoreService<DatabaseClientType, IDatabaseConfig> {
  private dbClient: DatabaseClientType | undefined;
  private serviceClass: MongoDBService | MySQLService | undefined;

  async init(container: AwilixContainer, config: IDatabaseConfig): Promise<void> {
    if (config.driver === 'mongodb') {
      const service = new MongoDBService();
      await service.init(container, config.params.mongodb);
      this.dbClient = service.service();
      this.serviceClass = service;
    } else if (config.driver === 'mysql') {
      const service = new MySQLService();
      await service.init(container, config.params.mysql);
      this.dbClient = service.service();
      this.serviceClass = service;
    } else {
      throw new Error(`Database driver ${config.driver} is not supported yet.`);
    }
  }

  service(): DatabaseClientType | undefined {
    return this.dbClient;
  }

  async shutdown(): Promise<void> {
    if (this.serviceClass) {
      await this.serviceClass.shutdown();
    }
  }
}
