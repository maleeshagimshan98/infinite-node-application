import type { IDriverConfig } from './core.driver.config';

export interface IDriverHealthStatus {
  connected: boolean;
  latency?: number;
  error?: string;
}

export interface ICoreDriver<T, K extends IDriverConfig> {
  init: () => Promise<void>;
  config(): K;
  client: () => T | undefined;
  shutdown: () => Promise<void>;

  /**
   * Check health status of the driver connection
   *
   * @returns {Promise<IDriverHealthStatus>} Health status including connection state and latency
   */
  health?: () => Promise<IDriverHealthStatus>;
}
