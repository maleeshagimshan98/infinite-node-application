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
    // The version of the resource the client read (from a GET); a stale one is rejected with 409 and nothing changes.
    version: {
      isInt: { options: { min: 0 } },
      toInt: true,
      errorMessage: 'version is required: the integer version of the resource you read',
    },
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
