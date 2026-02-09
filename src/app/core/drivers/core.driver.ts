import type { AwilixContainer } from 'awilix';
import type { IDriverConfig } from '../config/drivers/core.driver.config';
export interface ICoreDriver<T, K extends IDriverConfig> {
  init: (container: AwilixContainer, config: K) => Promise<void>;
  driver: () => T | undefined;
  shutdown: () => Promise<void>;
}
