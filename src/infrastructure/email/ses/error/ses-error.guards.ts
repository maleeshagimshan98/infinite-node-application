/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { SesError } from '@/infrastructure/email/ses/error/ses.error';

/**
 * Determine whether a failed send means SES is unreachable or failing, as opposed to it answering and refusing the
 * request. Used as the SES circuit breaker's `isFailure`.
 *
 * Counts network errors, timeouts, credential failures and server faults (5xx after the SDK's own retries). A
 * client-fault answer (MessageRejected, an unverified sender, a paused account, throttling the SDK already retried)
 * comes back quickly from a working SES; the breaker exists to stop sends waiting out timeouts on one that is down.
 *
 * @param {unknown} error - What the send threw.
 * @returns {boolean} True for an SesError that is not a client fault.
 */
export function isSesOutage(error: unknown): boolean {
  return error instanceof SesError && error.data?.fault !== 'client';
}
