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
    cg_id: {
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
    cg_id: {
      notEmpty: true,
    },
  };
};
