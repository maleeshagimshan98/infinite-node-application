/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Schema } from 'express-validator';

/**
 * Validates the body of the self-service registration endpoint (`POST /auth/register`).
 * Only `email`/`password` are collected from the caller — `ug_id`/`role_id`/`status` are
 * always resolved server-side by SignupApplicationService, so they're deliberately absent here.
 *
 * @returns {Schema} The express-validator schema.
 */
export const userValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
      errorMessage: 'A valid email is required',
    },
    password: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Password is required',
    },
  };
};

export const newUserValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
      errorMessage: 'A valid email is required',
    },
    password: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Password is required',
    },
    status: {
      optional: true,
      isIn: {
        options: [['pending_verification', 'active', 'suspended']],
      },
      errorMessage: 'Status must be one of pending_verification, active, suspended',
    },
    ug_id: {
      notEmpty: true,
      isString: true,
      errorMessage: 'User group id is required',
    },
    role_id: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Role id is required',
    },
  };
};

export const updateUserValidator = (): Schema => {
  return {
    email: {
      optional: true,
      isEmail: true,
      errorMessage: 'A valid email is required',
    },
    password: {
      optional: true,
      notEmpty: true,
      isString: true,
      errorMessage: 'Password must be a non-empty string',
    },
    status: {
      optional: true,
      isIn: {
        options: [['pending_verification', 'active', 'suspended']],
      },
      errorMessage: 'Status must be one of pending_verification, active, suspended',
    },
    ug_id: {
      optional: true,
      notEmpty: true,
      isString: true,
      errorMessage: 'User group id is required',
    },
    role_id: {
      optional: true,
      notEmpty: true,
      isString: true,
      errorMessage: 'Role id is required',
    },
  };
};
