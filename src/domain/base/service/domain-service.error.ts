/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type ServiceErrorType =
  | 'AUTHENTICATION_ERROR'
  | 'USER_PERMISSION_ERROR'
  | 'VALIDATION_ERROR'
  | 'INCOMPLETE_MODEL'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'UNKNOWN_ERROR'
  | 'MODEL_ALREADY_EXISTS'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR';

export class DomainServiceError extends Error {
  /**
   * The name of the error
   *
   * @type {string}
   */
  public name: string;

  /**
   * The API response data associated with the exception
   *
   * @type {APIResponse}
   */
  public type: ServiceErrorType;

  /**
   * Additional data associated with the exception
   *
   * @type {Record<string, unknown>}
   */
  public data: Record<string, unknown> = {};

  constructor(message: string, type: ServiceErrorType, data?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainServiceError';
    this.type = type;
    this.data = data || {};
  }
}
