import type { Schema } from 'express-validator';

/**
 * Validate a login request: email and password.
 *
 * @returns {Schema} The express-validator schema.
 */
export const loginCredentailValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
    password: {
      notEmpty: true,
    },
  };
};
