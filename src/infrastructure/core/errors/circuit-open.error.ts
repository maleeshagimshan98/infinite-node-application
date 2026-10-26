/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

/**
 * Thrown by a CircuitBreaker for a call it rejected without running, because the dependency it protects is
 * failing. Typed CONNECTION_ERROR so it reaches the client as a generic 503, like any other unreachable dependency.
 */
export class CircuitOpenError extends InfrastructureError {
  constructor(message: string, data?: Record<string, unknown>, options?: ErrorOptions) {
    super(message, 'CONNECTION_ERROR', data, options);
    this.name = 'CircuitOpenError';
  }
}
