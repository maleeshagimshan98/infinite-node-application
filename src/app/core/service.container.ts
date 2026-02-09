/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asFunction, createContainer } from 'awilix';

export const container = createContainer({
  injectionMode: 'CLASSIC',
});

export const registerService = (name: string, type: string, service: unknown): void => {
  if (type === 'singleton') {
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
