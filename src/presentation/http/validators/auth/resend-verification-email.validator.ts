import type { Schema } from 'express-validator';

/**
 * Validate a resend-verification-email request: the account email.
 *
 * @returns {Schema} The express-validator schema.
 */
export const resendVerificationEmailValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
  };
};
