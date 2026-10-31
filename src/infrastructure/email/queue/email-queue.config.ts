/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type EmailQueueBackoff = 'exponential' | 'fixed';

/**
 * Where queued emails wait and how a failed send is retried. Shared by every email driver.
 */
export interface IEmailQueueConfig {
  name: string;
  /** Total tries per email, including the first. */
  attempts: number;
  /** Backoff base delay in milliseconds. */
  retryDelay: number;
  backoff: EmailQueueBackoff;
}

/**
 * Narrow a string to an email queue backoff type.
 *
 * @param {string} value - The configured value.
 * @returns {value is EmailQueueBackoff} True when the value is 'exponential' or 'fixed'.
 */
function isEmailQueueBackoff(value: string): value is EmailQueueBackoff {
  return value === 'exponential' || value === 'fixed';
}

/**
 * Read the email queue settings from the environment.
 *
 * @returns {IEmailQueueConfig} The email queue settings.
 * @throws {RangeError} When EMAIL_QUEUE_ATTEMPTS is not an integer >= 1, EMAIL_QUEUE_RETRY_DELAY is not a finite
 * number >= 0, or EMAIL_QUEUE_BACKOFF is neither 'exponential' nor 'fixed'.
 */
export const emailQueueConfig = (): IEmailQueueConfig => {
  const appName = process.env.APP_NAME || 'infinite-node-application';
  // Not `Number(...) || default`: that would turn an explicit 0 into the default instead of rejecting it.
  const attempts = process.env.EMAIL_QUEUE_ATTEMPTS ? Number(process.env.EMAIL_QUEUE_ATTEMPTS) : 5;
  const retryDelay = process.env.EMAIL_QUEUE_RETRY_DELAY ? Number(process.env.EMAIL_QUEUE_RETRY_DELAY) : 10000;
  const backoff = process.env.EMAIL_QUEUE_BACKOFF || 'exponential';

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`EMAIL_QUEUE_ATTEMPTS must be an integer >= 1, got ${process.env.EMAIL_QUEUE_ATTEMPTS}`);
  }
  if (!Number.isFinite(retryDelay) || retryDelay < 0) {
    throw new RangeError(`EMAIL_QUEUE_RETRY_DELAY must be a number >= 0, got ${process.env.EMAIL_QUEUE_RETRY_DELAY}`);
  }
  if (!isEmailQueueBackoff(backoff)) {
    throw new RangeError(`EMAIL_QUEUE_BACKOFF must be 'exponential' or 'fixed', got ${backoff}`);
  }

  return {
    name: process.env.EMAIL_QUEUE_NAME || `${appName}-email-queue`,
    attempts,
    retryDelay,
    backoff,
  };
};
