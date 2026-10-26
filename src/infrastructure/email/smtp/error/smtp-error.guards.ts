/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { SmtpError } from '@/infrastructure/email/smtp/error/smtp.error';

/**
 * nodemailer codes for a server that answered and rejected this one message (its recipients, size or content).
 * The server itself is up, so these must not count towards opening the circuit for every other email.
 */
const MESSAGE_REJECTION_CODES: ReadonlySet<string> = new Set(['EENVELOPE', 'EMESSAGE']);

/**
 * Determine whether a failed send means the SMTP server is unreachable or failing, as opposed to it
 * rejecting one message. Used as the SMTP circuit breaker's `isFailure`.
 *
 * @param {unknown} error - What the send threw.
 * @returns {boolean} True for an SmtpError whose nodemailer code is not a message rejection.
 */
export function isSmtpOutage(error: unknown): boolean {
  if (!(error instanceof SmtpError)) {
    return false;
  }
  const code = error.data?.code;
  return typeof code !== 'string' || !MESSAGE_REJECTION_CODES.has(code);
}
