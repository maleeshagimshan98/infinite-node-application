import type { AwilixContainer } from 'awilix';
import type { IServiceConfig } from '../config/service/core.service.config';
export interface ICoreService<T, K extends IServiceConfig> {
  init: (container: AwilixContainer, config: K) => Promise<void>;
  service: () => T | undefined;
  shutdown: () => Promise<void>;
}
