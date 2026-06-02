/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export type InfrastructureErrorType =
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'QUEUE_ERROR'
  | 'SOCKET_ERROR'
  | 'DRIVER_ERROR'
  | 'CONNECTION_ERROR';

export class InfrastructureError extends Error {
  public type: InfrastructureErrorType;

  constructor(message: string, type: InfrastructureErrorType, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InfrastructureError';
    this.type = type;
  }
}
