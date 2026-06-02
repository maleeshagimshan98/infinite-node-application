/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IBaseInfrastructureService {
  serviceName(): string;
  singleton(): boolean;
  deferred(): boolean;
  getDriver: () => unknown;

  /**
   * Optional shutdown method for graceful cleanup
   * Implement this to close connections, flush buffers, etc.
   */
  shutdown?(): Promise<void>;

  /**
   * Optional method to check if service is shutting down
   */
  isShuttingDown?(): boolean;
}
