/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { PasswordResetCode } from '@/domain/auth/models/password-reset-code.model';
import type { IPasswordResetCode } from '@/domain/auth/models/password-reset-code.model';

import type { IBaseMapper } from '../base/base.mapper.interface';

export class PasswordResetCodeMapper implements IBaseMapper<IPasswordResetCode, PasswordResetCode> {
  toDomain(data: IPasswordResetCode): PasswordResetCode {
    return new PasswordResetCode(data);
  }

  toPersistence(data: PasswordResetCode): IPasswordResetCode {
    return {
      _id: data._id,
      email: data.email,
      code: data.code,
      valid_till: data.valid_till,
      status: data.status,
    };
  }
}
