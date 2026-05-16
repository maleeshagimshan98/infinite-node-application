/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

export interface IRedisConfig extends IDriverConfig {
  params: {
    url: string;
    ttl: string;
    connectionTimeout: string;
    socket?: {
      port?: number;
      host?: string;
      family?: 4 | 6 | 0;
      path?: string;
      connectTimeout?: number;
      socketTimeout?: number;
      noDelay?: boolean;
      keepAlive?: boolean;
      keepAliveInitialDelay?: number;
      // tls?: true | false; // TLS options -- TODO
      reconnectStrategy?: (retries: number) => number | Error;
    };
    username?: string; // ACL username
    password?: string; // ACL password
    name?: string; // CLIENT SETNAME
    database?: number; // Redis DB number (SELECT)

    /**
     * Modules, scripts, and functions definitions
     * These are usually provided by extending Redis with modules/lua scripts/functions
     */
    // modules?: Record<string, unknown>;
    // scripts?: Record<string, unknown>;
    // functions?: Record<string, unknown>;

    /**
     * Max internal command queue length
     */
    commandsQueueMaxLength?: number;

    /**
     * Disable offline queueing (default false)
     */
    disableOfflineQueue?: boolean;

    /**
     * Connect in READONLY mode (default false)
     */
    readonly?: boolean;

    /**
     * Legacy mode for backwards compatibility (default false)
     */
    legacyMode?: boolean;

    /**
     * Isolation pool configuration
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isolationPoolOptions?: Record<string, any>; //... TODO - Fix

    /**
     * Send PING command at given interval (ms)
     */
    pingInterval?: number;

    /**
     * Disable CLIENT SETINFO auto-sending (default false)
     */
    disableClientInfo?: boolean;
  };
}

export const redisConfig = (): IRedisConfig => {
  const config: IRedisConfig = {
    driverName: 'redis',
    singleton: true,
    deferred: false,
    optional: process.env.REDIS_SERVICE_OPTIONAL === 'true',
    params: {
      url: process.env.REDIS_SERVER_URL || 'redis://127.0.0.1:6379',
      ttl: process.env.REDIS_TTL || '3600',
      // socket: {
      //   port: Number(process.env.REDIS_SOCKET_PORT) || 6379,
      //   host: process.env.REDIS_SOCKET_HOST || 'localhost',
      //   family: (Number(process.env.REDIS_SOCKET_FAMILY) || 0) as 4 | 6 | 0,
      //   path: process.env.REDIS_SOCKET_PATH || undefined,
      //   connectTimeout: Number(process.env.REDIS_SOCKET_CONNECT_TIMEOUT) || 5000,
      //   socketTimeout: Number(process.env.REDIS_SOCKET_TIMEOUT) || undefined,
      //   noDelay: process.env.REDIS_SOCKET_NO_DELAY === 'true',
      //   keepAlive: process.env.REDIS_SOCKET_KEEP_ALIVE === 'true',
      //   keepAliveInitialDelay: Number(process.env.REDIS_SOCKET_KEEP_ALIVE_INITIAL_DELAY) || 5000,
      //   tls: process.env.REDIS_SOCKET_TLS === 'true' ? {} : undefined,
      //   reconnectStrategy: (retries): number | Error => {
      //     const delay = Math.min(1000 * 2 ** retries, 30000);
      //     return delay;
      //   },
      // },
      connectionTimeout: process.env.REDIS_CONNECTION_TIMEOUT || '5000',
    },
  };
  return config;
};
