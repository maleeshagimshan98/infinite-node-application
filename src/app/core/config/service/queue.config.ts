/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface IQueueConfig extends IServiceConfig {
  queueName: string;
  config: {
    port: number;
    host: string;
    username: string;
    password: string;
  };
}

export const queueConfig = (): IQueueConfig => ({
  singleton: true,
  deferred: true,
  queueName: process.env.QUEUE_NAME || 'inf_node_app_default_queue',
  config: {
    port: 6379,
    host: process.env.CACHE_SERVER_HOST || 'localhost',
    username: process.env.CACHE_SERVER_USERNAME || '',
    password: process.env.CACHE_SERVER_PASSWORD || '',
  },
});
