/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type InfrastructureErrorType =
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'QUEUE_ERROR'
  | 'SOCKET_ERROR'
  | 'DRIVER_ERROR'
  | 'CONNECTION_ERROR'
  | 'EMAIL_ERROR'
  | 'CACHE_ERROR'
  | 'STORAGE_ERROR'
  | 'NOTIFICATION_ERROR';

export class InfrastructureError extends Error {
  public type: InfrastructureErrorType;
  public data: Record<string, unknown> | undefined;

  constructor(message: string, type: InfrastructureErrorType, data?: Record<string, unknown>, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InfrastructureError';
    this.type = type;
    this.data = data;
  }
}
