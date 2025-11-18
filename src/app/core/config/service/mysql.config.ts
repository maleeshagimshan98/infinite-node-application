/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IMySQLConfig extends IServiceConfig {
  params: {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
  };
}

export const mysqlConfig = (): IMySQLConfig => {
  return {
    serviceName: 'mysql',
    singleton: true,
    deferred: false,
    params: {
      host: process.env.MYSQL_DATABASE_SERVER_HOST ?? 'localhost',
      port: process.env.MYSQL_DATABASE_SERVER_PORT ?? '3306',
      user: process.env.MYSQL_DATABASE_USERNAME ?? '',
      password: process.env.MYSQL_DATABASE_PASSWORD ?? '',
      database: process.env.MYSQL_DATABASE_NAME ?? '',
    },
  };
};
