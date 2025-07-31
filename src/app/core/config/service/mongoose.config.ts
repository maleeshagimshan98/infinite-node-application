/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type mongoose from 'mongoose';
import type { IServiceConfig } from './core.service.config';

export interface IMongooseConfig extends IServiceConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export const mongooseConfig = (): IMongooseConfig => ({
  singleton: true,
  deferred: true,
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite-node',
  //   options: {
  //     // useNewUrlParser: true,
  //     // useUnifiedTopology: true,
  //     user: process.env.MONGODB_USERNAME,
  //     pass: process.env.MONGODB_PASSWORD,
  //     dbName: process.env.MONGODB_NAME,
  //   },
});
