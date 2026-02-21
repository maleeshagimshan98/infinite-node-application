/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

import type mongoose from 'mongoose';

export interface IMongooseConfig extends IDriverConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export const mongooseConfig = (): IMongooseConfig => ({
  driverName: 'mongoose',
  singleton: true,
  deferred: true,
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite-node-application',
  //   options: {
  //     // useNewUrlParser: true,
  //     // useUnifiedTopology: true,
  //     user: process.env.MONGODB_USERNAME,
  //     pass: process.env.MONGODB_PASSWORD,
  //     dbName: process.env.MONGODB_NAME,
  //   },
});
