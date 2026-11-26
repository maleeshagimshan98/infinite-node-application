/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';
import type { ICircuitBreakerOptions } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';

export interface ISNSConfig extends IDriverConfig {
  /** Unset leaves the region to the AWS SDK's provider chain (AWS_REGION, which ECS sets, or the AWS profile). */
  region: string | undefined;
  /** The topic every device is subscribed to; `broadcastNotification()` publishes to it. Unset disables broadcasts. */
  broadcastTopicArn: string | undefined;
  connectionTimeout: number;
  requestTimeout: number;
  circuitBreaker: Pick<ICircuitBreakerOptions, 'failureThreshold' | 'resetTimeout'>;
}

/**
 * Read the AWS SNS push notification driver settings from the environment.
 *
 * Credentials are never read here: the AWS SDK takes them from its default provider chain (the ECS task role in
 * production, an AWS profile locally).
 *
 * @returns {ISNSConfig} The SNS driver settings.
 */
export const snsConfig = (): ISNSConfig => ({
  driverName: 'pushNotification',
  singleton: true,
  deferred: false,
  optional: process.env.PUSH_NOTIFICATION_SERVICE_OPTIONAL === 'true' || false,
  region: process.env.PUSH_NOTIFICATION_SNS_REGION || undefined,
  broadcastTopicArn: process.env.PUSH_NOTIFICATION_SNS_BROADCAST_TOPIC_ARN || undefined,
  // The SDK's default for both is 0, which never times out.
  connectionTimeout: Number(process.env.PUSH_NOTIFICATION_SNS_CONNECTION_TIMEOUT) || 5000,
  requestTimeout: Number(process.env.PUSH_NOTIFICATION_SNS_REQUEST_TIMEOUT) || 10000,
  circuitBreaker: {
    // Not `Number(...) || 5`: that would turn an explicit 0 (open on the first failure) into 5.
    failureThreshold: process.env.PUSH_NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD
      ? Number(process.env.PUSH_NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD)
      : 5,
    resetTimeout: Number(process.env.PUSH_NOTIFICATION_CIRCUIT_RESET_TIMEOUT) || 30000,
  },
});
