/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

export class PersistanceError extends InfrastructureError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'DATABASE_ERROR', undefined, options);
    this.name = 'PersistanceError';
  }
}
