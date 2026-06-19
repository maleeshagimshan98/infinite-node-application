/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { NewLoginRecord } from '@/domain/auth/models/login-record';
import { LoginRecord } from '@/domain/auth/models/login-record';

import type { IBaseMapper } from '../base/base.mapper.interface';
import type { ILoginRecordSchema } from './login-record.model';

export class LoginRecordMapper implements IBaseMapper<ILoginRecordSchema, LoginRecord, NewLoginRecord> {
  toDomain(data: ILoginRecordSchema & { _id: string }): LoginRecord {
    return new LoginRecord({
      id: data._id,
      user_id: data.user_id,
      token: data.token,
      valid_till: data.valid_till,
      status: data.status,
    });
  }

  toPersistence(data: NewLoginRecord): ILoginRecordSchema {
    return !data.id
      ? {
          // New entity (no ID yet)
          user_id: data.user_id,
          token: data.token,
          valid_till: data.valid_till,
          status: data.status,
        }
      : {
          // Existing entity (has ID)
          _id: data.id,
          user_id: data.user_id,
          token: data.token,
          valid_till: data.valid_till,
          status: data.status,
        };
  }

  toFilter(filter: Partial<NewLoginRecord>): Partial<ILoginRecordSchema> {
    const { id, ...rest } = filter;
    return id !== undefined ? { _id: id, ...rest } : { ...rest };
  }
}
