/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { cacheConfig, type ICacheConfig } from './cache.config';
import { databaseConfig, type IDatabaseConfig } from './database.config';
import type { IEmailConfig } from './email.config';
import { emailConfig } from './email.config';
import type { IStorageConfig } from './storage.config';
import { storageConfig } from './storage.config';

export interface ServiceConfig {
  cache: ICacheConfig;
  db: IDatabaseConfig;
  socket: Record<string, unknown>;
  storage: IStorageConfig;
  email: IEmailConfig;
  notification: {
    email: {
      enabled: boolean;
    };
    sms: {
      enabled: boolean;
    };
  };
  logging: Record<string, unknown>;
}

export const serviceConfig = (): ServiceConfig => ({
  cache: cacheConfig(),
  db: databaseConfig(),
  socket: {},
  storage: storageConfig(),
  email: emailConfig(),
  notification: {
    email: {
      enabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
    },
    sms: {
      enabled: process.env.NOTIFICATION_SMS_ENABLED === 'true',
    },
  },
  logging: {},
});
