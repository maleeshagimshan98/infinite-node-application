/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { DomainServiceError } from './domain-service.error';

export class BaseDomainService {
  constructor() {}

  protected async wrapInfrastructureErrors<T>(
    fn: () => Promise<T>,
    onError?: (error: InfrastructureError) => Promise<void> | void,
  ): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof InfrastructureError) {
        await onError?.(e);
        throw new DomainServiceError(e.message, 'INFRASTRUCTURE_ERROR', { type: e.type });
      }
      throw e;
    }
  }
}
