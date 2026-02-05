/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IMongoDBConfig extends IServiceConfig {
  uri: string;
  options: {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
    useCreateIndex: boolean;
    useFindAndModify: boolean;
  };
}

export const mongodbConfig = (): IMongoDBConfig => {
  return {
    serviceName: 'mongodb',
    singleton: true,
    deferred: false,
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite_node',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    },
  };
};
