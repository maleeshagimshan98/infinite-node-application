/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';
import type { ICircuitBreakerOptions } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';
import { emailQueueConfig } from '@/infrastructure/email/queue/email-queue.config';
import type { IEmailQueueConfig } from '@/infrastructure/email/queue/email-queue.config';

export interface ISESConfig extends IDriverConfig {
  /** Unset leaves the region to the AWS SDK's provider chain (AWS_REGION, which ECS sets, or the AWS profile). */
  region: string | undefined;
  /** The sender; must be an identity verified in SES. */
  from: string;
  connectionTimeout: number;
  requestTimeout: number;
  circuitBreaker: Pick<ICircuitBreakerOptions, 'failureThreshold' | 'resetTimeout'>;
  queue: IEmailQueueConfig;
}

/**
 * Read the AWS SES email driver settings from the environment.
 *
 * Credentials are never read here: the AWS SDK takes them from its default provider chain (the ECS task role in
 * production, an AWS profile locally).
 *
 * @returns {ISESConfig} The SES driver settings.
 * @throws {RangeError} When EMAIL_FROM is not set, or the email queue settings are invalid.
 */
export const sesConfig = (): ISESConfig => {
  const from = process.env.EMAIL_FROM || '';
  if (!from) {
    throw new RangeError('EMAIL_FROM must be set to a verified SES identity to use the SES email driver');
  }

  return {
    driverName: 'email',
    singleton: true,
    deferred: true,
    optional: process.env.EMAIL_SERVICE_OPTIONAL === 'true' || false,
    region: process.env.EMAIL_SES_REGION || undefined,
    from,
    // The SDK's default for both is 0, which never times out.
    connectionTimeout: Number(process.env.EMAIL_SES_CONNECTION_TIMEOUT) || 5000,
    requestTimeout: Number(process.env.EMAIL_SES_REQUEST_TIMEOUT) || 10000,
    circuitBreaker: {
      // Not `Number(...) || 5`: that would turn an explicit 0 (open on the first failure) into 5.
      failureThreshold: process.env.EMAIL_CIRCUIT_FAILURE_THRESHOLD
        ? Number(process.env.EMAIL_CIRCUIT_FAILURE_THRESHOLD)
        : 5,
      resetTimeout: Number(process.env.EMAIL_CIRCUIT_RESET_TIMEOUT) || 30000,
    },
    queue: emailQueueConfig(),
  };
};
