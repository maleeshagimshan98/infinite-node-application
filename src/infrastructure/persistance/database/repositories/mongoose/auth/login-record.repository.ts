/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { LoginRecord, NewLoginRecord } from '@/domain/auth/models/login-record';
import type { ILoginRecordRepository } from '@/application/interfaces/repositories/auth/login-record.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { LoginRecordMapper } from './login-record.mapper';
import { LoginRecordModel } from './login-record.model';

import type { ILoginRecordSchema } from './login-record.model';

export class LoginRecordRepository
  extends BaseRepository<ILoginRecordSchema, LoginRecord, NewLoginRecord>
  implements ILoginRecordRepository
{
  constructor() {
    super(LoginRecordModel, new LoginRecordMapper());
  }
}

export default LoginRecordRepository;
