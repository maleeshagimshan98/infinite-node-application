/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { redisConfig, type IRedisConfig } from './redis.config';
import type { IEmailConfig } from './email.config';
import { emailConfig } from './email.config';
import { loggingConfig, type ILoggingConfig } from './winston.config';
import { notificationConfig, type INotificationConfig } from './notification.config';
import type { IQueueConfig } from './queue.config';
import { queueConfig } from './queue.config';
import type { ISocketConfig } from './socket.config';
import { socketConfig } from './socket.config';
import type { IFileSystemStorageConfig } from './local-file-storage.config';
import { storageConfig } from './local-file-storage.config';
import type { IDatabaseConfig } from './database.config';
import { databaseConfig } from './database.config';
import type { ICacheConfig } from './cache.config';
import { cacheConfig } from './cache.config';

export type DriverConfig = {
  redis: IRedisConfig;
  cache: ICacheConfig;
  queue: IQueueConfig;
  database: IDatabaseConfig;
  socket: ISocketConfig;
  storage: IFileSystemStorageConfig;
  email: IEmailConfig;
  notification: INotificationConfig;
  logger: ILoggingConfig;
};

export const driverConfig = (): DriverConfig => ({
  redis: redisConfig(),
  cache: cacheConfig(),
  database: databaseConfig(),
  queue: queueConfig(),
  socket: socketConfig(),
  storage: storageConfig(),
  email: emailConfig(),
  notification: notificationConfig(),
  logger: loggingConfig(),
});
