/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { asFunction, createContainer } from 'awilix';
import type { IServiceConfig } from '../config/service/core.service.config';

export const container = createContainer({
  injectionMode: 'CLASSIC',
});

export const registerService = (
  name: string,
  container: AwilixContainer,
  config: IServiceConfig,
  service: unknown,
): void => {
  if (config.singleton) {
    container.register({
      [name]: asFunction(() => service).singleton(),
    });
  } else {
    //... TODO - CHECK
    container.register({
      [name]: asFunction(() => service),
    });
  }
};
