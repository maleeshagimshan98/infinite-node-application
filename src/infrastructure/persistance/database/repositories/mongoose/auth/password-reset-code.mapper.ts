/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { PasswordResetCode } from '@/domain/auth/models/password-reset-code';
import type { NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';

import type { IPasswordResetCodeSchema } from './password-reset-code.model';
import type { IBaseMapper } from '../base/base.mapper.interface';

export class PasswordResetCodeMapper
  implements IBaseMapper<IPasswordResetCodeSchema, PasswordResetCode, NewPasswordResetCode>
{
  toDomain(data: IPasswordResetCodeSchema & { _id: string }): PasswordResetCode {
    return new PasswordResetCode({
      id: data._id,
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
          _id: data.id,
          email: data.email,
          code: data.code,
          valid_till: data.valid_till,
          status: data.status,
        };
  }

  toFilter(filter: Partial<NewPasswordResetCode>): Partial<IPasswordResetCodeSchema> {
    const { id, ...rest } = filter;
    return id !== undefined ? { _id: id, ...rest } : { ...rest };
  }
}
