/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from './core.driver.config';

export interface ISocketConfig extends IDriverConfig {
  params?: {
    path?: string;
    cors?: {
      origin: string | string[];
      methods?: string[];
    };
  };
}

export const socketConfig = (): ISocketConfig => ({
  driverName: 'socket',
  singleton: true,
  deferred: true,
  optional: process.env.SOCKET_SERVICE_OPTIONAL === 'true',
  params: {
    path: process.env.SOCKET_PATH || '/socket.io',
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: (process.env.SOCKET_CORS_METHODS || 'GET,POST').split(',').map((m) => m.trim()),
    },
  },
});
