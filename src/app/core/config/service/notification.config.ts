/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface INotificationConfig extends IServiceConfig {
  test: string;
}

export const notificationConfig = (): INotificationConfig => ({
  deffered: true,
  test: '',
});
