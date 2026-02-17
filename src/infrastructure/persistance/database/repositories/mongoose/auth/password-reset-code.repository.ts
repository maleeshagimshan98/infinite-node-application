/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IPasswordResetCode, PasswordResetCode } from '@/domain/auth/models/password-reset-code.model';

import { BaseRepository } from '../base/base-repository';
import { PasswordResetCodeMapper } from './password-reset-code.mapper';

import type mongoose from 'mongoose';

export class PasswordResetCodeRepository extends BaseRepository<IPasswordResetCode, PasswordResetCode> {
  constructor(passwordResetCodeModel: mongoose.Model<IPasswordResetCode>) {
    super(passwordResetCodeModel, new PasswordResetCodeMapper());
  }
}
