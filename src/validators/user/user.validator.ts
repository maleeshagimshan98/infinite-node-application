import type { Schema } from 'express-validator';

export const userValidator = (): Schema => {
  return {
    'profile.name': {
      notEmpty: true,
    },
    'profile.email': {
      isEmail: true,
    },
    'profile.address.st_line_1': {
      notEmpty: true,
    },
    'profile.address.st_line_2': {
      optional: true,
    },
    'profile.address.city': {
      notEmpty: true,
    },
    'profile.address.state': {
      notEmpty: true,
    },
    'profile.address.country': {
      notEmpty: true,
    },
    'profile.address.zipcode': {
      notEmpty: true,
      isPostalCode: { options: 'any' },
    },
    'profile.address.is_billing_address': {
      isBoolean: true,
    },
    'profile.phone': {
      notEmpty: true,
      isMobilePhone: { options: 'any' },
    },
    password: {
      notEmpty: true,
    },
  };
};
