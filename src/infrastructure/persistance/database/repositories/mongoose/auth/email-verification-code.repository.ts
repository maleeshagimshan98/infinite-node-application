/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { EmailVerificationCode, NewEmailVerificationCode } from '@/domain/auth/models/email-verification-code';
import type { IEmailVerificationCodeRepository } from '@/application/interfaces/repositories/auth/email-verification-code.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { EmailVerificationCodeMapper } from './email-verification-code.mapper';
import { EmailVerificationCodeModel, type INewEmailVerificationCodeSchema } from './email-verification-code.model';

export class EmailVerificationCodeRepository
  extends BaseRepository<INewEmailVerificationCodeSchema, EmailVerificationCode, NewEmailVerificationCode>
  implements IEmailVerificationCodeRepository
{
  constructor() {
    super(EmailVerificationCodeModel, new EmailVerificationCodeMapper());
  }
}

export default EmailVerificationCodeRepository;
