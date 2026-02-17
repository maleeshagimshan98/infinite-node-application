/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ILoginRecord, LoginRecord } from '@/domain/auth/models/login-record.model';

import { BaseRepository } from '../base/base-repository';
import { LoginRecordMapper } from './login-record.mapper';

import type mongoose from 'mongoose';

export class LoginRecordRepository extends BaseRepository<ILoginRecord, LoginRecord> {
  constructor(loginRecordModel: mongoose.Model<ILoginRecord>) {
    super(loginRecordModel, new LoginRecordMapper());
  }
}
