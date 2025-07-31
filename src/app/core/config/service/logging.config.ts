/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface ILoggingConfig extends IServiceConfig {
  winston: {
    level: string;
    format: string;
    transports: Array<{
      type: string;
      options: {
        level?: string;
        format?: string;
        filename?: string;
      };
    }>;
  };
}

export const loggingConfig = (): ILoggingConfig => {
  return {
    singleton: true,
    deferred: true,
    winston: {
      level: 'info',
      format: 'json',
      transports: [
        {
          type: 'console',
          options: { level: 'info', format: 'simple' },
        },
        { type: 'file', options: { filename: 'application.log', level: 'info', format: 'json' } },
        { type: 'file', options: { filename: 'error.log', level: 'error', format: 'json' } },
      ],
    },
  };
};
