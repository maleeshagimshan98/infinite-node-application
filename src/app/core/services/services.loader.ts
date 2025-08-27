import { cacheServiceLoader } from './cache/cache.service.loader';
import { dbServiceLoader } from './database/db.service.loader';
import { mongooseServiceLoader } from './mongoose/mongoose.service.loader';
import { storageServiceLoader } from './storage/storage.service.loader';
import { emailServiceLoader } from './email/email.service.loader';
import { socketsServiceLoader } from './socket/sockets.service.loader';
import { notificationServiceLoader } from './notification/notification.service.loader';
import { loggingServiceLoader } from './logging/logging.service.loader';
import type { AwilixContainer } from 'awilix/lib/container';
import type { ServiceConfig } from '../config/service/services.config';

export type ServiceLoaders = {
  [PropertyKey in keyof ServiceConfig]: (
    name: string,
    container: AwilixContainer,
    config: ServiceConfig[PropertyKey],
  ) => void;
};

export const serviceLoaders: ServiceLoaders = {
  cache: cacheServiceLoader,
  db: dbServiceLoader,
  mongoose: mongooseServiceLoader,
  socket: socketsServiceLoader,
  storage: storageServiceLoader,
  email: emailServiceLoader,
  notification: notificationServiceLoader,
  logger: loggingServiceLoader,
};
