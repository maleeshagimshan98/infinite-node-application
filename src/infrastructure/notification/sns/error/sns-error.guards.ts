/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { SnsError } from '@/infrastructure/notification/sns/error/sns.error';

/**
 * Determine whether a failed publish means SNS is unreachable or failing, as opposed to it answering and refusing
 * the request. Used as the SNS circuit breaker's `isFailure`.
 *
 * Counts network errors, timeouts, credential failures and server faults (5xx after the SDK's own retries). A
 * client-fault answer (an invalid parameter, a disabled device endpoint, a denied IAM action, throttling the SDK
 * already retried) comes back quickly from a working SNS; the breaker exists to stop publishes waiting out
 * timeouts on one that is down.
 *
 * @param {unknown} error - What the publish threw.
 * @returns {boolean} True for an SnsError that is not a client fault.
 */
export function isSnsOutage(error: unknown): boolean {
  return error instanceof SnsError && error.data?.fault !== 'client';
}
