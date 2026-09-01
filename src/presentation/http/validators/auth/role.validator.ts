import type { Schema } from 'express-validator';

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

export const updateRoleValidator = (): Schema => {
  return {
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
