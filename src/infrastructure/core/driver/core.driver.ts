import type { IDriverConfig } from './core.driver.config';

export interface IDriverHealthStatus {
  connected: boolean;
  latency?: number;
  error?: string;
}

export interface ICoreDriver<T, K extends IDriverConfig> {
  init: () => Promise<void>;
  /**
   * Get the driver's configuration.
   *
   * @returns {K} The configuration the driver was created with.
   */
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
