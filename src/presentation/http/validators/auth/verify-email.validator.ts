import type { Schema } from 'express-validator';

/**
 * Validate a verify-email request: email and verification code.
 *
 * @returns {Schema} The express-validator schema.
 */
export const verifyEmailValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
    code: {
      isString: true,
      notEmpty: true,
    },
  };
};
