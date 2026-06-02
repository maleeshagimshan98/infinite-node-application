/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

export interface IQueueConfig extends IDriverConfig {
  queueName: string;
  params: {
    port: number;
    host: string;
    username: string;
    password: string;
  };
}

export const queueConfig = (): IQueueConfig => ({
  driverName: 'queue',
  singleton: true,
  deferred: true,
  optional: process.env.QUEUE_SERVICE_OPTIONAL === 'true',
  queueName: process.env.QUEUE_NAME || 'inf_node_app_default_queue',
  params: {
    port: Number(process.env.REDIS_SERVER_PORT ?? '6379'),
    host: process.env.REDIS_SERVER_HOST || 'localhost',
    username: process.env.REDIS_SERVER_USERNAME || '',
    password: process.env.REDIS_SERVER_PASSWORD || '',
  },
});
