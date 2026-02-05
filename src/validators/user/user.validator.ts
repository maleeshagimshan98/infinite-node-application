import type { Schema } from 'express-validator';

export const newUserValidator = (): Schema => {
  return {
    'profile.first_name': {
      optional: true,
      notEmpty: true,
    },
    'profile.last_name': {
      optional: true,
      notEmpty: true,
    },
    'profile.email': {
      isEmail: true,
    },
    'profile.address.st_line_1': {
      optional: true,
      notEmpty: true,
    },
    'profile.address.st_line_2': {
      optional: true,
    },
    'profile.address.city': {
      optional: true,
      notEmpty: true,
    },
    'profile.address.state': {
      optional: true,
      notEmpty: true,
    },
    'profile.address.country': {
      optional: true,
      notEmpty: true,
    },
    'profile.address.zipcode': {
      optional: true,
      notEmpty: true,
      isPostalCode: { options: 'any' },
    },
    'profile.address.is_billing_address': {
      optional: true,
      isBoolean: true,
    },
    'profile.phone': {
      optional: true,
      notEmpty: true,
      isMobilePhone: { options: 'any' },
    },
    'profile.profile_img': {
      optional: true,
      isURL: true,
    },
    password: {
      notEmpty: true,
    },
  };
};

export const userValidator = (): Schema => {
  return {
    'profile.first_name': {
      notEmpty: true,
    },
    'profile.last_name': {
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
      optional: true,
      notEmpty: true,
      isMobilePhone: { options: 'any' },
    },
    'profile.profile_img': {
      optional: true,
      isURL: true,
    },
    password: {
      notEmpty: true,
    },
  };
};
