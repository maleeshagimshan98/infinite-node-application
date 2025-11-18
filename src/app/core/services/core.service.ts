import type { AwilixContainer } from 'awilix';
import type { IServiceConfig } from '../config/service/core.service.config';

export interface ICoreService<T extends IServiceConfig = IServiceConfig> {
  init: (container: AwilixContainer, config: T) => Promise<void>;
  service: () => unknown;
  shutdown: () => Promise<void>;
}
