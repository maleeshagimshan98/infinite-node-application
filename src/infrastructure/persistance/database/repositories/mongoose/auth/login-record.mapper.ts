/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewLoginRecord } from '@/domain/auth/models/login-record';
import { LoginRecord } from '@/domain/auth/models/login-record';

import { BaseMapper } from '../base/base.mapper';

import type { INewLoginRecordSchema } from './login-record.model';

export class LoginRecordMapper extends BaseMapper<INewLoginRecordSchema, LoginRecord, NewLoginRecord> {
  /**
   * Convert a persisted login record document into a LoginRecord domain model.
   *
   * @param {INewLoginRecordSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {LoginRecord} The mapped domain model.
   */
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

  /**
   * Convert a new/updated login record domain model into its persistence schema shape.
   *
   * @param {NewLoginRecord} data - The domain model data to persist.
   * @returns {INewLoginRecordSchema} The persistence-ready schema object.
   */
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
          _id: new Types.ObjectId(data.id),
          user_id: data.user_id,
          token: data.token,
          refresh_token: data.refresh_token,
          access_token_valid_till: data.access_token_valid_till,
          refresh_token_valid_till: data.refresh_token_valid_till,
          status: data.status,
        };
  }
}
