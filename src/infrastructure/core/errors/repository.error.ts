/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type RepositoryErrorType = 'DUPLICATE_KEY' | 'INVALID_ID';

/**
 * A repository rejected the caller's data (a duplicate unique value, a malformed id) — not an
 * infrastructure failure, so it deliberately does not extend InfrastructureError. The message carries
 * driver details (index names, key values) and is for the logs only.
 */
export class RepositoryError extends Error {
  public type: RepositoryErrorType;
  public data: Record<string, unknown> | undefined;

  constructor(message: string, type: RepositoryErrorType, data?: Record<string, unknown>, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RepositoryError';
    this.type = type;
    this.data = data;
  }
}
