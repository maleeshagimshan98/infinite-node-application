import type { Schema } from 'express-validator';

/**
 * Validate a create-resource request.
 *
 * @returns {Schema} The express-validator schema.
 */
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

/**
 * Validate an update-resource request, including the `version` the client read.
 *
 * @returns {Schema} The express-validator schema.
 */
export const updateResourceValidator = (): Schema => {
  return {
    // The version of the resource the client read (from a GET); a stale one is rejected with 409 and nothing changes.
    // Optional here because If-Match can carry it instead; the controller requires one of the two.
    version: {
      in: ['body'],
      optional: true,
      isInt: { options: { min: 0 } },
      toInt: true,
      errorMessage: 'version must be the integer version of the resource you read',
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

/**
 * Validate a delete-resource request: the `version` the client read, when it is sent as a query parameter instead of
 * in If-Match.
 *
 * @returns {Schema} The express-validator schema.
 */
export const deleteResourceValidator = (): Schema => {
  return {
    // A stale version is rejected with 409 and nothing is deleted; the controller requires this or If-Match.
    version: {
      in: ['query'],
      optional: true,
      isInt: { options: { min: 0 } },
      toInt: true,
      errorMessage: 'version must be the integer version of the resource you read',
    },
  };
};
