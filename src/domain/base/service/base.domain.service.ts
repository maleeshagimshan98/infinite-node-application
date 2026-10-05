/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';
import type { RepositoryErrorType } from '@/infrastructure/core/errors/repository.error';

import { DomainServiceError } from './domain-service.error';

import type { ServiceErrorType } from './domain-service.error';

// The repository's own message carries driver details (index names, key values), and these service
// error types send their message to the client — so each gets a fixed, client-safe message.
const REPOSITORY_ERROR_MAP: Record<RepositoryErrorType, { type: ServiceErrorType; message: string }> = {
  DUPLICATE_KEY: { type: 'ALREADY_EXISTS', message: 'A record with the same unique value already exists.' },
  INVALID_ID: { type: 'VALIDATION_ERROR', message: 'The provided id is not a valid identifier.' },
};

export class BaseDomainService {
  constructor() {}

  /**
   * Run an async operation, converting any thrown RepositoryError or InfrastructureError into a
   * DomainServiceError so domain services never leak infrastructure-layer error types to their callers.
   *
   * @param {() => Promise<T>} fn - The async operation to protect.
   * @param {(error: InfrastructureError) => Promise<void> | void} [onError] - Optional callback invoked with the raw InfrastructureError before it is re-thrown, for per-call logging or alerting. Not invoked for a RepositoryError, which is bad caller data rather than an outage.
   * @returns {Promise<T>} The resolved value of `fn` when it succeeds.
   * @throws {DomainServiceError} ALREADY_EXISTS — when `fn` throws a DUPLICATE_KEY RepositoryError.
   * @throws {DomainServiceError} VALIDATION_ERROR — when `fn` throws an INVALID_ID RepositoryError.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — when `fn` throws an InfrastructureError.
   */
  protected async wrapInfrastructureErrors<T>(
    fn: () => Promise<T>,
    onError?: (error: InfrastructureError) => Promise<void> | void,
  ): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof RepositoryError) {
        throw this.mapRepositoryError(e);
      }
      if (e instanceof InfrastructureError) {
        await onError?.(e);
        throw new DomainServiceError(e.message, 'INFRASTRUCTURE_ERROR', { type: e.type });
      }
      throw e;
    }
  }

  /**
   * Map a RepositoryError to the DomainServiceError its callers should see, with a client-safe message.
   *
   * @param {RepositoryError} error - The repository error to translate.
   * @returns {DomainServiceError} The matching domain service error.
   */
  private mapRepositoryError(error: RepositoryError): DomainServiceError {
    const { type, message } = REPOSITORY_ERROR_MAP[error.type];
    return new DomainServiceError(message, type);
  }
}
