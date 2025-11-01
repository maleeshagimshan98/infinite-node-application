import type { Schema } from 'express-validator';

export const forgotPasswordValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
  };
};
