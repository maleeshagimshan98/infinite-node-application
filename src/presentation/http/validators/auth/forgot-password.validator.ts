import type { Schema } from 'express-validator';

/**
 * Validate a forgot-password request: the account email.
 *
 * @returns {Schema} The express-validator schema.
 */
export const forgotPasswordValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
  };
};
