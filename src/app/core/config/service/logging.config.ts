/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface ILoggingConfig extends IServiceConfig {
  test: string;
}

export const loggingConfig = (): ILoggingConfig => {
  return {
    deffered: true,
    test: '',
  };
};
