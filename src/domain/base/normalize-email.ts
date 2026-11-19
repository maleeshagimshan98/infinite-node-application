/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * Normalize an email address the way it is stored and matched: trimmed and in lowercase.
 *
 * The unique indexes on emails compare exact strings, so `A@x.com` and `a@x.com` would otherwise be two accounts.
 * Every entity that stores an email normalizes it, and every lookup by email must normalize its input first.
 *
 * @param {string} email - The email address as given.
 * @returns {string} The trimmed, lowercase address.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
