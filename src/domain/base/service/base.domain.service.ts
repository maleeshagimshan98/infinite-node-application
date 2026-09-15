/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { DomainServiceError } from './domain-service.error';

export class BaseDomainService {
  constructor() {}

  /**
   * Run an async operation, converting any thrown InfrastructureError into a DomainServiceError
   * so domain services never leak infrastructure-layer error types to their callers.
   *
   * @param {() => Promise<T>} fn - The async operation to protect.
   * @param {(error: InfrastructureError) => Promise<void> | void} [onError] - Optional callback invoked with the raw InfrastructureError before it is re-thrown, for per-call logging or alerting.
   * @returns {Promise<T>} The resolved value of `fn` when it succeeds.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — when `fn` throws an InfrastructureError.
   */
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
