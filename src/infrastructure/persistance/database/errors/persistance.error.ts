/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

export class PersistanceError extends InfrastructureError {
  constructor(message: string, data?: Record<string, unknown>, options?: ErrorOptions) {
    super(message, 'DATABASE_ERROR', data, options);
    this.name = 'PersistanceError';
  }
}
