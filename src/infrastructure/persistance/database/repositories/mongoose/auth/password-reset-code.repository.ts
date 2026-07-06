/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { PasswordResetCode, NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';
import type { IPasswordResetCodeRepository } from '@/application/interfaces/repositories/auth/password-reset-code.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { PasswordResetCodeMapper } from './password-reset-code.mapper';
import { PasswordResetCodeModel, type IPasswordResetCodeSchema } from './password-reset-code.model';

export class PasswordResetCodeRepository
  extends BaseRepository<IPasswordResetCodeSchema, PasswordResetCode, NewPasswordResetCode>
  implements IPasswordResetCodeRepository
{
  constructor() {
    super(PasswordResetCodeModel, new PasswordResetCodeMapper());
  }
}

export default PasswordResetCodeRepository;
