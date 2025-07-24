import { cacheServiceLoader } from './cache/cache.service.loader';
import { dbServiceLoader } from './database/db.service.loader';
import { storageServiceLoader } from './storage/storage.service.loader';
import { emailServiceLoader } from './email/email.service.loader';

export const serviceLoaders = {
  cache: cacheServiceLoader,
  db: dbServiceLoader,
  socket: (): void => {}, // Placeholder for socket service loader
  storage: storageServiceLoader,
  email: emailServiceLoader,
  notification: (): void => {}, // Placeholder for notification service loader
  logging: (): void => {}, // Placeholder for logging service loader
};
