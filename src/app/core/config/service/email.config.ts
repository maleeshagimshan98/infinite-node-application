/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IEmailConfig extends IServiceConfig {
  driver: string;
  smtp: {
    host: string;
    port: string;
    username: string;
    password: string;
    secure: boolean;
  };
}

export const emailConfig = (): IEmailConfig => ({
  driver: process.env.EMAIL_DRIVER || 'smtp',
  singleton: false,
  deferred: true,
  smtp: {
    host: process.env.EMAIL_SMTP_HOST || 'localhost',
    port: process.env.EMAIL_SMTP_PORT || '587',
    username: process.env.EMAIL_SMTP_USERNAME || 'user',
    password: process.env.EMAIL_SMTP_PASSWORD || 'password',
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
  },
});
