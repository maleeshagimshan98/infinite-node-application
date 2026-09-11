/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

export class SmtpError extends InfrastructureError {
  constructor(message: string, data: Record<string, unknown>, options?: ErrorOptions) {
    super(message, 'EMAIL_ERROR', data, options);
    this.name = 'SmtpError';
  }
}
