/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { IDatabaseConfig } from '../../config/drivers/database.config';
import type { ICoreDriver } from '../core.driver';
import { MongoDBDriver } from './mongodb/mongodb.driver';
import type { MongoClient } from 'mongodb';
import type { Pool } from 'mysql';
import { MySQLDriver } from './mysql/mysql.driver';

export type DatabaseClientType = MongoClient | Pool;

export class DatabaseDriver implements ICoreDriver<DatabaseClientType, IDatabaseConfig> {
  private dbClient: DatabaseClientType | undefined;
  private serviceClass: MongoDBDriver | MySQLDriver | undefined;

  async init(container: AwilixContainer, config: IDatabaseConfig): Promise<void> {
    if (config.driver === 'mongodb') {
      const service = new MongoDBDriver();
      await service.init(container, config.params.mongodb);
      this.dbClient = service.driver();
      this.serviceClass = service;
    } else if (config.driver === 'mysql') {
      const service = new MySQLDriver();
      await service.init(container, config.params.mysql);
      this.dbClient = service.driver();
      this.serviceClass = service;
    } else {
      throw new Error(`Database driver ${config.driver} is not supported yet.`);
    }
  }

  driver(): DatabaseClientType | undefined {
    return this.dbClient;
  }

  async shutdown(): Promise<void> {
    if (this.serviceClass) {
      await this.serviceClass.shutdown();
    }
  }
}
