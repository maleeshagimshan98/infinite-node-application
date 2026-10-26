/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';
import type { ICircuitBreakerOptions } from '@/infrastructure/core/interfaces/circuit-breaker.interface';

export interface ISMTPConfig extends IDriverConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  circuitBreaker: Pick<ICircuitBreakerOptions, 'failureThreshold' | 'resetTimeout'>;
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
    // nodemailer defaults are 2 min / 30 s / 10 min, and it never retries — an unreachable host would stall each send.
    connectionTimeout: Number(process.env.EMAIL_SMTP_CONNECTION_TIMEOUT) || 10000,
    greetingTimeout: Number(process.env.EMAIL_SMTP_GREETING_TIMEOUT) || 10000,
    socketTimeout: Number(process.env.EMAIL_SMTP_SOCKET_TIMEOUT) || 30000,
    circuitBreaker: {
      // Not `Number(...) || 5`: that would turn an explicit 0 (open on the first failure) into 5.
      failureThreshold: process.env.EMAIL_CIRCUIT_FAILURE_THRESHOLD
        ? Number(process.env.EMAIL_CIRCUIT_FAILURE_THRESHOLD)
        : 5,
      resetTimeout: Number(process.env.EMAIL_CIRCUIT_RESET_TIMEOUT) || 30000,
    },
  };
};
