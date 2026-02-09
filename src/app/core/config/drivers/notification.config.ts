/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from './core.driver.config';

export interface INotificationConfig extends IDriverConfig {
  params?: {
    // TODO: extend with provider details (email/sms/push)
    driver?: 'inmemory';
  };
}

export const notificationConfig = (): INotificationConfig => ({
  driverName: 'notification',
  singleton: true,
  deferred: true,
  optional: process.env.NOTIFICATION_SERVICE_OPTIONAL === 'true',
  params: {
    driver: 'inmemory',
  },
});
