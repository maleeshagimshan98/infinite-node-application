import type { Schema } from 'express-validator';

export const resendVerificationEmailValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
  };
};
