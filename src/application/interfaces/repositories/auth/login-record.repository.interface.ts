/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { LoginRecord, NewLoginRecord } from '@/domain/auth/models/login-record';

import type { IBaseRepository } from '../base.repository.interface';

export interface ILoginRecordRepository extends IBaseRepository<LoginRecord, NewLoginRecord> {}

export default ILoginRecordRepository;
