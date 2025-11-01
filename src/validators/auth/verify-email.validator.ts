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
