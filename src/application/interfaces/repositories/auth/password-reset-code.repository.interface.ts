/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { PasswordResetCode, NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';

import type { IBaseRepository } from '../base.repository.interface';

export interface IPasswordResetCodeRepository extends IBaseRepository<PasswordResetCode, NewPasswordResetCode> {}

export default IPasswordResetCodeRepository;
