import type { Schema } from 'express-validator';

export const newResourceValidator = (): Schema => {
  return {
    name: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Resource name is required',
    },
    description: {
      optional: true,
      isString: true,
    },
  };
};

export const updateResourceValidator = (): Schema => {
  return {
    name: {
      optional: true,
      notEmpty: true,
      isString: true,
      errorMessage: 'Resource name is required',
    },
    description: {
      optional: true,
      isString: true,
    },
  };
};
