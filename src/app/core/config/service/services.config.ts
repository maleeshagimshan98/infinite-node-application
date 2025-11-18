/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { redisConfig, type IRedisConfig } from './redis.config';
import { mongodbConfig, type IMongoDBConfig } from './mongodb.config';
import { mysqlConfig, type IMySQLConfig } from './mysql.config';
import type { IEmailConfig } from './email.config';
import { emailConfig } from './email.config';
import { loggingConfig, type ILoggingConfig } from './winston.config';
import { mongooseConfig, type IMongooseConfig } from './mongoose.config';
import { notificationConfig, type INotificationConfig } from './notification.config';
import type { IQueueConfig } from './queue.config';
import { queueConfig } from './queue.config';
import type { ISocketConfig } from './socket.config';
import { socketConfig } from './socket.config';
import type { IFileSystemStorageConfig } from './local-file-storage.config';
import { storageConfig } from './local-file-storage.config';

export type ServiceConfig = {
  redis: IRedisConfig;
  mongodb: IMongoDBConfig;
  mysql: IMySQLConfig;
  queue: IQueueConfig;
  mongoose: IMongooseConfig;
  socket: ISocketConfig;
  storage: IFileSystemStorageConfig;
  email: IEmailConfig;
  notification: INotificationConfig;
  logger: ILoggingConfig;
};

export const serviceConfig = (): ServiceConfig => ({
  redis: redisConfig(),
  mongodb: mongodbConfig(),
  mysql: mysqlConfig(),
  queue: queueConfig(),
  mongoose: mongooseConfig(),
  socket: socketConfig(),
  storage: storageConfig(),
  email: emailConfig(),
  notification: notificationConfig(),
  logger: loggingConfig(),
});
