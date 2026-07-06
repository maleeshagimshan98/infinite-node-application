import type { Schema } from 'express-validator';

export const newUserValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
    password: {
      notEmpty: true,
    },
    status: {
      optional: true,
      isIn: {
        options: [['pending_verification', 'active', 'suspended']],
      },
    },
    ug_id: {
      optional: true,
      notEmpty: true,
    },
  };
};

export const userValidator = (): Schema => {
  return {
    email: {
      isEmail: true,
    },
    password: {
      notEmpty: true,
    },
    status: {
      isIn: {
        options: [['pending_verification', 'active', 'suspended']],
      },
    },
    ug_id: {
      notEmpty: true,
    },
  };
};
