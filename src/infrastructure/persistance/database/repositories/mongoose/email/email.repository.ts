/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Email, NewEmail } from '@/domain/app/email/models/email';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { EmailMapper } from './email.mapper';
import { EmailModel } from './email.model';

import type { INewEmailSchema } from './email.model';

export class EmailRepository extends BaseRepository<INewEmailSchema, Email, NewEmail> implements IEmailRepository {
  constructor() {
    super(EmailModel, new EmailMapper());
  }
}

export default EmailRepository;
