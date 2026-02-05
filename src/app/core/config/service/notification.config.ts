/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface INotificationConfig extends IServiceConfig {
  params?: {
    // TODO: extend with provider details (email/sms/push)
    driver?: 'inmemory';
  };
}

export const notificationConfig = (): INotificationConfig => ({
  serviceName: 'notification',
  singleton: true,
  deferred: true,
  optional: process.env.NOTIFICATION_SERVICE_OPTIONAL === 'true',
  params: {
    driver: 'inmemory',
  },
});
