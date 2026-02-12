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
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    logging: {},
  };
};
