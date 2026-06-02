/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

export class SocketError extends InfrastructureError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'SOCKET_ERROR', options);
    this.name = 'SocketError';
  }
}
