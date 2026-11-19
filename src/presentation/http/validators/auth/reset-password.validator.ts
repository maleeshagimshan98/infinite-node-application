import type { Schema } from 'express-validator';

/**
 * Validate a reset-password request: email, reset code, and the new password with its confirmation.
 *
 * @returns {Schema} The express-validator schema.
 */
export const resetPasswordValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
    verification_code: {
      notEmpty: true,
    },
    password: {
      notEmpty: true,
    },
    password_confirmation: {
      notEmpty: true,
      custom: {
        options: (value, { req }) => value === req.body.password,
        errorMessage: 'Password confirmation does not match password',
      },
    },
  };
};
