/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { LoginRecord } from '@/domain/auth/models/login-record.model';
import type { ILoginRecord } from '@/domain/auth/models/login-record.model';

import type { IBaseMapper } from '../base/base.mapper.interface';

export class LoginRecordMapper implements IBaseMapper<ILoginRecord, LoginRecord> {
  toDomain(data: ILoginRecord): LoginRecord {
    return new LoginRecord(data);
  }

  toPersistence(data: LoginRecord): ILoginRecord {
    return {
      _id: data._id,
      user_id: data.user_id,
      token: data.token,
      valid_till: data.valid_till,
      status: data.status,
    };
  }
}
