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
  /**
   * Convert a persisted password reset code document into a PasswordResetCode domain model.
   *
   * @param {IPasswordResetCodeSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {PasswordResetCode} The mapped domain model.
   */
  toDomain(data: IPasswordResetCodeSchema & { _id: Types.ObjectId }): PasswordResetCode {
    return new PasswordResetCode({
      id: data._id.toString(),
      email: data.email,
      code: data.code,
      valid_till: data.valid_till,
      status: data.status,
    });
  }

  /**
   * Convert a new/updated password reset code domain model into its persistence schema shape.
   *
   * @param {NewPasswordResetCode} data - The domain model data to persist.
   * @returns {IPasswordResetCodeSchema} The persistence-ready schema object.
   */
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
