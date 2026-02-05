/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IEmailConfig extends IServiceConfig {
  params: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
    from?: string;
  };
}

export const emailConfig = (): IEmailConfig => {
  return {
    serviceName: 'email',
    singleton: true,
    deferred: false,
    optional: process.env.EMAIL_SERVICE_OPTIONAL === 'true',
    params: {
      host: process.env.EMAIL_SMTP_HOST || 'localhost',
      port: Number(process.env.EMAIL_SMTP_PORT) || 587,
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SMTP_USERNAME || '',
        pass: process.env.EMAIL_SMTP_PASSWORD || '',
      },
      from: process.env.EMAIL_FROM || '',
    },
  };
};
