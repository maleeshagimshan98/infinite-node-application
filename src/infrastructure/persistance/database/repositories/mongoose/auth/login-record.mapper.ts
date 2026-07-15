/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { NewLoginRecord } from '@/domain/auth/models/login-record';
import { LoginRecord } from '@/domain/auth/models/login-record';

import { BaseMapper } from '../base/base.mapper';

import type { Types } from 'mongoose';
import type { INewLoginRecordSchema } from './login-record.model';

export class LoginRecordMapper extends BaseMapper<INewLoginRecordSchema, LoginRecord, NewLoginRecord> {
  toDomain(data: INewLoginRecordSchema & { _id: Types.ObjectId }): LoginRecord {
    return new LoginRecord({
      id: data._id.toString(),
      user_id: data.user_id,
      token: data.token,
      refresh_token: data.refresh_token,
      access_token_valid_till: data.access_token_valid_till,
      refresh_token_valid_till: data.refresh_token_valid_till,
      status: data.status,
    });
  }

  toPersistence(data: NewLoginRecord): INewLoginRecordSchema {
    return !data.id
      ? {
          user_id: data.user_id,
          token: data.token,
          refresh_token: data.refresh_token,
          access_token_valid_till: data.access_token_valid_till,
          refresh_token_valid_till: data.refresh_token_valid_till,
          status: data.status,
        }
      : {
          _id: data.id,
          user_id: data.user_id,
          token: data.token,
          refresh_token: data.refresh_token,
          access_token_valid_till: data.access_token_valid_till,
          refresh_token_valid_till: data.refresh_token_valid_till,
          status: data.status,
        };
  }
}
