/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { serverConfig } from './server.config';
import { coreMiddlewareConfig } from '../middleware/middleware.config';
import { appConfig } from './app.config';

import type { IAppConfig } from './app.config';
import type { ServerConfig } from './server.config';

export type INodeApplicationConfig = {
  server: ServerConfig;
  global_middleware: typeof coreMiddlewareConfig;
  app: IAppConfig;
  jwt: unknown;
  logging: Record<string, unknown>;
};

export const configLoader: () => INodeApplicationConfig = () => {
  return {
    server: serverConfig(),
    global_middleware: coreMiddlewareConfig,
    app: appConfig(),
    jwt: {
      privateKey: process.env.JWT_PRIVATE_KEY ?? '',
      publicKey: process.env.JWT_PUBLIC_KEY ?? '',
      expiresIn: '1h',
    },
    refreshTokenTtlMs: parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000), 10),
    logging: {},
  };
};
