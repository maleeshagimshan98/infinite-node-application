/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { cacheConfig, type ICacheConfig } from './cache.config';
import { databaseConfig, type IDatabaseConfig } from './database.config';
import type { IEmailConfig } from './email.config';
import { emailConfig } from './email.config';
import { loggingConfig, type ILoggingConfig } from './logging.config';
import { mongooseConfig, type IMongooseConfig } from './mongoose.config';
import { notificationConfig, type INotificationConfig } from './notification.config';
import type { IQueueConfig } from './queue.config';
import { queueConfig } from './queue.config';
import type { ISocketConfig } from './socket.config';
import { socketConfig } from './socket.config';
import type { IStorageConfig } from './storage.config';
import { storageConfig } from './storage.config';

export type ServiceConfig = {
  cache: ICacheConfig;
  db: IDatabaseConfig;
  queue: IQueueConfig;
  mongoose: IMongooseConfig;
  socket: ISocketConfig;
  storage: IStorageConfig;
  email: IEmailConfig;
  notification: INotificationConfig;
  logger: ILoggingConfig;
};

export const serviceConfig = (): ServiceConfig => ({
  cache: cacheConfig(),
  db: databaseConfig(),
  queue: queueConfig(),
  mongoose: mongooseConfig(),
  socket: socketConfig(),
  storage: storageConfig(),
  email: emailConfig(),
  notification: notificationConfig(),
  logger: loggingConfig(),
});
