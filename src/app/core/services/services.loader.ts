/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { redisServiceLoader } from './cache/redis/redis.service.loader';
import { mongooseServiceLoader } from './mongoose/mongoose.service.loader';
import { localFileStorageServiceLoader } from './storage/local-filestorage/local-file-storage.service.loader';
import { emailServiceLoader } from './email/email.service.loader';
import { socketsServiceLoader } from './socket/sockets.service.loader';
import { notificationServiceLoader } from './notification/notification.service.loader';
import { winstonServiceLoader } from './logging/winston/winston.service.loader';
import { queueServiceLoader } from './queue/queue.service.loader';
import type { ServiceConfig } from '../config/service/services.config';
import type { AwilixContainer } from 'awilix';
import type { RedisService } from './cache/redis/redis.service';
import type { EmailService } from './email/email.service';
import type { LoggingService } from './logging/winston/winston.service';
import type { MongooseService } from './mongoose/mongoose.service';
import type { NotificationService } from './notification/notification.service';
import type { QueueService } from './queue/queue.service';
import type { SocketsService } from './socket/sockets.service';
import type { LocalFileStorageService } from './storage/local-filestorage/local-file-storage.service';
import { databaseServiceLoader } from './database/database.service.loader';
import type { DatabaseService } from './database/database.service';
import { cacheServiceLoader } from './cache/cache.service.loader';
import type { CacheService } from './cache/cache.service';

export type ServiceReturnTypes = {
  redis: RedisService;
  cache: CacheService;
  database: DatabaseService;
  email: EmailService;
  logger: LoggingService;
  mongoose: MongooseService;
  notification: NotificationService;
  queue: QueueService;
  socket: SocketsService;
  storage: LocalFileStorageService;
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
  [key in keyof ServiceConfig]: (
    container: AwilixContainer,
    config: ServiceConfig[key],
  ) => Promise<ServiceReturnTypes[key]>;
};

export const serviceLoaders: ServiceLoaders = {
  redis: redisServiceLoader,
  cache: cacheServiceLoader,
  database: databaseServiceLoader,
  email: emailServiceLoader,
  logger: winstonServiceLoader,
  mongoose: mongooseServiceLoader,
  notification: notificationServiceLoader,
  queue: queueServiceLoader,
  socket: socketsServiceLoader,
  storage: localFileStorageServiceLoader,
};
