/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

export interface ISMTPConfig extends IDriverConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
}

export const smtpConfig = (): ISMTPConfig => {
  return {
    driverName: 'email',
    singleton: true,
    deferred: true,
    optional: process.env.EMAIL_SERVICE_OPTIONAL === 'true' || false,
    host: process.env.EMAIL_SMTP_HOST || 'localhost',
    port: Number(process.env.EMAIL_SMTP_PORT) || 587,
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SMTP_USERNAME || '',
      pass: process.env.EMAIL_SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || '',
  };
};
