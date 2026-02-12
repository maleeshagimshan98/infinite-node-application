import type { IDriverConfig } from './core.driver.config';
export interface ICoreDriver<T, K extends IDriverConfig> {
  init: () => Promise<void>;
  config(): K;
  client: () => T | undefined;
  shutdown: () => Promise<void>;
}
