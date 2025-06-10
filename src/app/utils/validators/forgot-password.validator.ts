/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Schema } from 'express-validator';

export const forgotPasswordValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
  };
};
