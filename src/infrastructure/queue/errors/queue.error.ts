/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

export class QueueError extends InfrastructureError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'QUEUE_ERROR', options);
    this.name = 'QueueError';
  }
}
