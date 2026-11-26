import type { Schema } from 'express-validator';

/**
 * Validate a create-role request.
 *
 * @returns {Schema} The express-validator schema.
 */
export const newRoleValidator = (): Schema => {
  return {
    name: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Role name is required',
    },
    description: {
      optional: true,
      isString: true,
    },
    default: {
      optional: true,
      isBoolean: true,
    },
    resource_permissions: {
      isArray: true,
    },
    'resource_permissions.*.resource_id': {
      isString: true,
      notEmpty: true,
    },
    'resource_permissions.*.permission.read': {
      isBoolean: true,
    },
    'resource_permissions.*.permission.write': {
      isBoolean: true,
    },
    'resource_permissions.*.permission.update': {
      isBoolean: true,
    },
    'resource_permissions.*.permission.delete': {
      isBoolean: true,
    },
  };
};

/**
 * Validate an update-role request, including the `version` the client read.
 *
 * @returns {Schema} The express-validator schema.
 */
export const updateRoleValidator = (): Schema => {
  return {
    // The version of the role the client read (from a GET); a stale one is rejected with 409 and nothing changes.
    // Optional here because If-Match can carry it instead; the controller requires one of the two.
    version: {
      in: ['body'],
      optional: true,
      isInt: { options: { min: 0 } },
      toInt: true,
      errorMessage: 'version must be the integer version of the role you read',
    },
    name: {
      optional: true,
      notEmpty: true,
      isString: true,
      errorMessage: 'Role name is required',
    },
    description: {
      optional: true,
      isString: true,
    },
    default: {
      optional: true,
      isBoolean: true,
    },
    resource_permissions: {
      optional: true,
      isArray: true,
    },
    'resource_permissions.*.resource_id': {
      optional: true,
      isString: true,
      notEmpty: true,
    },
    'resource_permissions.*.permission.read': {
      optional: true,
      isBoolean: true,
    },
    'resource_permissions.*.permission.write': {
      optional: true,
      isBoolean: true,
    },
    'resource_permissions.*.permission.update': {
      optional: true,
      isBoolean: true,
    },
    'resource_permissions.*.permission.delete': {
      optional: true,
      isBoolean: true,
    },
  };
};

/**
 * Validate a delete-role request: the `version` the client read, when it is sent as a query parameter instead of in
 * If-Match.
 *
 * @returns {Schema} The express-validator schema.
 */
export const deleteRoleValidator = (): Schema => {
  return {
    // A stale version is rejected with 409 and nothing is deleted; the controller requires this or If-Match.
    version: {
      in: ['query'],
      optional: true,
      isInt: { options: { min: 0 } },
      toInt: true,
      errorMessage: 'version must be the integer version of the role you read',
    },
  };
};
