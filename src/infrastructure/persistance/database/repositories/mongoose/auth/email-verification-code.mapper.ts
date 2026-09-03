/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { EmailVerificationCode } from '@/domain/auth/models/email-verification-code';
import type { NewEmailVerificationCode } from '@/domain/auth/models/email-verification-code';

import { BaseMapper } from '../base/base.mapper';

import type { INewEmailVerificationCodeSchema } from './email-verification-code.model';

export class EmailVerificationCodeMapper extends BaseMapper<
  INewEmailVerificationCodeSchema,
  EmailVerificationCode,
  NewEmailVerificationCode
> {
  toDomain(data: INewEmailVerificationCodeSchema & { _id: Types.ObjectId }): EmailVerificationCode {
    return new EmailVerificationCode({
      id: data._id.toString(),
      user_id: data.user_id.toString(),
      email: data.email,
      code: data.code,
      status: data.status,
      valid_till: data.valid_till,
      ...(data.verified_at && { verified_at: data.verified_at }),
    });
  }

  toPersistence(data: NewEmailVerificationCode): INewEmailVerificationCodeSchema {
    const base = {
      email: data.email,
      code: data.code,
      status: data.status,
      valid_till: data.valid_till,
      // toFilter() (inherited from BaseMapper) calls toPersistence with a partial filter object
      // cast to NewEmailVerificationCode, so user_id/verified_at may genuinely be absent here
      // (e.g. findOne({ email, code, status }), used by the verify-email flow) — keep these
      // conditional so an unrelated filter never picks up an incorrect clause, and so
      // toFilter's undefined-stripping works instead of `new Types.ObjectId(undefined)` throwing.
      ...(data.user_id !== undefined && { user_id: new Types.ObjectId(data.user_id) }),
      ...(data.verified_at !== undefined && { verified_at: data.verified_at }),
    };
    return (!data.id ? base : { ...base, _id: new Types.ObjectId(data.id) }) as INewEmailVerificationCodeSchema;
  }
}
