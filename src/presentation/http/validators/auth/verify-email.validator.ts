import type { Schema } from 'express-validator';

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
