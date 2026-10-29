/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Email, NewEmail } from '@/domain/app/email/models/email';

import type { IBaseRepository } from '../base.repository.interface';

// A type alias, not an empty interface (`@typescript-eslint/no-empty-object-type`); turn it into an interface
// that extends IBaseRepository once it gains email-specific queries.
export type IEmailRepository = IBaseRepository<Email, NewEmail>;

export default IEmailRepository;
