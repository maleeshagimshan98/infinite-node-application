import type { Schema } from 'express-validator';

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
