/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { redisServiceLoader } from './cache/redis/redis.service.loader';
import { mongoDbServiceLoader } from './database/mongodb/mongodb.service.loader';
import { mongooseServiceLoader } from './mongoose/mongoose.service.loader';
import { localFileStorageServiceLoader } from './storage/local-filestorage/local-file-storage.service.loader';
import { emailServiceLoader } from './email/email.service.loader';
import { socketsServiceLoader } from './socket/sockets.service.loader';
import { notificationServiceLoader } from './notification/notification.service.loader';
import { winstonServiceLoader } from './logging/winston/winston.service.loader';
import { queueServiceLoader } from './queue/queue.service.loader';
import { mysqlServiceLoader } from './database/mysql/mysql.service.loader';
import type { AwilixContainer } from 'awilix';
import type { RedisService } from './cache/redis/redis.service';
import type { MongoDBService } from './database/mongodb/mongodb.service';
import type { MySQLService } from './database/mysql/mysql.service';
import type { EmailService } from './email/email.service';
import type { LoggingService } from './logging/winston/winston.service';
import type { MongooseService } from './mongoose/mongoose.service';
import type { NotificationService } from './notification/notification.service';
import type { QueueService } from './queue/queue.service';
import type { LocalFileStorageService } from './storage/local-filestorage/local-file-storage.service';
import type { SocketsService } from './socket/sockets.service';
import type { IRedisConfig } from '../config/service/redis.config';
import type { IMySQLConfig } from '../config/service/mysql.config';
import type { IFileSystemStorageConfig } from '../config/service/local-file-storage.config';
import type { ISocketConfig } from '../config/service/socket.config';
import type { IQueueConfig } from '../config/service/queue.config';
import type { INotificationConfig } from '../config/service/notification.config';
import type { IMongooseConfig } from '../config/service/mongoose.config';
import type { ILoggingConfig } from '../config/service/winston.config';
import type { IEmailConfig } from '../config/service/email.config';
import type { IMongoDBConfig } from '../config/service/mongodb.config';

export type ServiceLoaders = {
  redis: (container: AwilixContainer, config: IRedisConfig) => Promise<RedisService>;
  mongodb: (container: AwilixContainer, config: IMongoDBConfig) => Promise<MongoDBService>;
  mysql: (container: AwilixContainer, config: IMySQLConfig) => Promise<MySQLService>;
  email: (container: AwilixContainer, config: IEmailConfig) => Promise<EmailService>;
  logger: (container: AwilixContainer, config: ILoggingConfig) => Promise<LoggingService>;
  mongoose: (container: AwilixContainer, config: IMongooseConfig) => Promise<MongooseService>;
  notification: (container: AwilixContainer, config: INotificationConfig) => Promise<NotificationService>;
  queue: (container: AwilixContainer, config: IQueueConfig) => Promise<QueueService>;
  socket: (container: AwilixContainer, config: ISocketConfig) => Promise<SocketsService>;
  storage: (container: AwilixContainer, config: IFileSystemStorageConfig) => Promise<LocalFileStorageService>;
};

export const serviceLoaders: ServiceLoaders = {
  redis: redisServiceLoader,
  mongodb: mongoDbServiceLoader,
  mysql: mysqlServiceLoader,
  email: emailServiceLoader,
  logger: winstonServiceLoader,
  mongoose: mongooseServiceLoader,
  notification: notificationServiceLoader,
  queue: queueServiceLoader,
  socket: socketsServiceLoader,
  storage: localFileStorageServiceLoader,
};
