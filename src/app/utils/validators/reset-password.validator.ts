/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Schema } from 'express-validator';

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
