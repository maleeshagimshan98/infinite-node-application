/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { redisDriverLoader } from './cache/redis/redis.driver.loader';
import { localFileStorageDriverLoader } from './storage/local-filestorage/local-file-storage..driver';
import { emailDriverLoader } from './email/email.driver.loader';
import { socketsDriverLoader } from './socket/sockets.driver.loader';
import { notificationDriverLoader } from './notification/notification.driver.loader';
import { winstonDriverLoader } from './logging/winston/winston.driver.loader';
import { queueDriverLoader } from './queue/queue.driver.loader';
import type { DriverConfig } from '../config/drivers/drivers.config';
import type { AwilixContainer } from 'awilix';
import type { RedisDriver } from './cache/redis/redis.driver';
import type { EmailDriver } from './email/email.driver';
import type { LoggingService } from './logging/winston/winston.driver';
import type { NotificationDriver } from './notification/notification.driver';
import type { QueueDriver } from './queue/queue.driver';
import type { SocketsDriver } from './socket/sockets.driver';
import type { LocalFileStorageDriver } from './storage/local-filestorage/local-file-storage.driver';
import { databaseDriverLoader } from './database/database.driver.loader';
import type { DatabaseDriver } from './database/database.driver';
import { cacheDriverLoader } from './cache/cache.driver.loader';
import type { CacheDriver } from './cache/cache.service';

export type ServiceReturnTypes = {
  redis: RedisDriver;
  cache: CacheDriver;
  database: DatabaseDriver;
  email: EmailDriver;
  logger: LoggingService;
  notification: NotificationDriver;
  queue: QueueDriver;
  socket: SocketsDriver;
  storage: LocalFileStorageDriver;
};

// export type ServiceLoaders = {
//   redis: (container: AwilixContainer, config: IRedisConfig) => Promise<RedisService>;
//   mongodb: (container: AwilixContainer, config: IMongoDBConfig) => Promise<MongoDBService>;
//   mysql: (container: AwilixContainer, config: IMySQLConfig) => Promise<MySQLService>;
//   email: (container: AwilixContainer, config: IEmailConfig) => Promise<EmailService>;
//   logger: (container: AwilixContainer, config: ILoggingConfig) => Promise<LoggingService>;
//   mongoose: (container: AwilixContainer, config: IMongooseConfig) => Promise<MongooseService>;
//   notification: (container: AwilixContainer, config: INotificationConfig) => Promise<NotificationService>;
//   queue: (container: AwilixContainer, config: IQueueConfig) => Promise<QueueService>;
//   socket: (container: AwilixContainer, config: ISocketConfig) => Promise<SocketsService>;
//   storage: (container: AwilixContainer, config: IFileSystemStorageConfig) => Promise<LocalFileStorageService>;
// };

export type ServiceLoaders = {
  [key in keyof DriverConfig]: (
    container: AwilixContainer,
    config: DriverConfig[key],
  ) => Promise<ServiceReturnTypes[key]>;
};

export const serviceLoaders: ServiceLoaders = {
  redis: redisDriverLoader,
  cache: cacheDriverLoader,
  database: databaseDriverLoader,
  email: emailDriverLoader,
  logger: winstonDriverLoader,
  notification: notificationDriverLoader,
  queue: queueDriverLoader,
  socket: socketsDriverLoader,
  storage: localFileStorageDriverLoader,
};
