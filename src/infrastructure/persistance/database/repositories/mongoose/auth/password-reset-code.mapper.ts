/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { PasswordResetCode } from '@/domain/auth/models/password-reset-code';
import type { NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';

import { BaseMapper } from '../base/base.mapper';

import type { IPasswordResetCodeSchema } from './password-reset-code.model';

export class PasswordResetCodeMapper extends BaseMapper<
  IPasswordResetCodeSchema,
  PasswordResetCode,
  NewPasswordResetCode
> {
  toDomain(data: IPasswordResetCodeSchema & { _id: Types.ObjectId }): PasswordResetCode {
    return new PasswordResetCode({
      id: data._id.toString(),
      email: data.email,
      code: data.code,
      valid_till: data.valid_till,
      status: data.status,
    });
  }

  toPersistence(data: NewPasswordResetCode): IPasswordResetCodeSchema {
    return !data.id
      ? {
          // New entity (no ID yet)
          email: data.email,
          code: data.code,
          valid_till: data.valid_till,
          status: data.status,
        }
      : {
          // Existing entity (has ID)
          _id: new Types.ObjectId(data.id),
          email: data.email,
          code: data.code,
          valid_till: data.valid_till,
          status: data.status,
        };
  }
}
