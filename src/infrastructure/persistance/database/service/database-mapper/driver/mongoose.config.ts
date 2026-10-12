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
  options: {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 15000,
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
    // user: process.env.MONGODB_USERNAME,
    // pass: process.env.MONGODB_PASSWORD,
    // dbName: process.env.MONGODB_NAME,
  },
});
