/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface DatabaseConfigMySQL {
  uri: string;
  username: string;
  password: string;
  name: string;
}

export interface DatabaseConfigMongoDB {
  uri: string;
  options: {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
    useCreateIndex: boolean;
    useFindAndModify: boolean;
  };
}

export interface IDatabaseConfig extends IServiceConfig {
  driver: string;
  mysql: DatabaseConfigMySQL;
  mongodb: DatabaseConfigMongoDB;
}

export const databaseConfig = (): IDatabaseConfig => {
  return {
    driver: process.env.DB_DRIVER || 'mysql',
    deffered: false,
    mysql: {
      uri: process.env.MYSQL_DATABASE_SERVER_URI || 'mysql://localhost:3306/infinite_node',
      username: process.env.MYSQL_DATABASE_USERNAME || 'root',
      password: process.env.MYSQL_DATABASE_PASSWORD || 'password',
      name: process.env.MYSQL_DATABASE_NAME || 'infinite_node',
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite_node',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      },
    },
  };
};
