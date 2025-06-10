/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Schema } from 'express-validator';

export const verifyEmailValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
    token: {
      isString: true,
    },
  };
};
