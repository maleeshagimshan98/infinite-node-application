/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';
import type { IMongoDBConfig } from './mongodb.config';
import { mongodbConfig } from './mongodb.config';
import type { IMySQLConfig } from './mysql.config';
import { mysqlConfig } from './mysql.config';

export interface IDatabaseConfig extends IServiceConfig {
  driver: 'mongodb' | 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
  params: {
    mongodb: IMongoDBConfig;
    mysql: IMySQLConfig;
  };
}

export const databaseConfig = (): IDatabaseConfig => {
  return {
    serviceName: 'database',
    singleton: true,
    deferred: false,
    optional: false,
    driver: (process.env.DATABASE_DRIVER as 'mongodb' | 'mysql' | 'postgresql' | 'sqlite' | 'mssql') || 'mongodb',
    params: {
      mongodb: mongodbConfig(),
      mysql: mysqlConfig(),
    },
  };
};
