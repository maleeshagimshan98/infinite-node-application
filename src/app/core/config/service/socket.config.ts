/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface ISocketConfig extends IServiceConfig {
  params?: {
    path?: string;
    cors?: {
      origin: string | string[];
      methods?: string[];
    };
  };
}

export const socketConfig = (): ISocketConfig => ({
  serviceName: 'socket',
  singleton: true,
  deferred: true,
  params: {
    path: process.env.SOCKET_PATH || '/socket.io',
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: (process.env.SOCKET_CORS_METHODS || 'GET,POST').split(',').map((m) => m.trim()),
    },
  },
});
