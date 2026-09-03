/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { EmailVerificationCode, NewEmailVerificationCode } from '@/domain/auth/models/email-verification-code';

import type { IBaseRepository } from '../base.repository.interface';

export interface IEmailVerificationCodeRepository extends IBaseRepository<
  EmailVerificationCode,
  NewEmailVerificationCode
> {}

export default IEmailVerificationCodeRepository;
