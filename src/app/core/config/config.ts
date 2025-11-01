/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ServerConfig } from './server.config';
import { serverConfig } from './server.config';
import { middlewareConfig } from './middleware.config';
import type { IAppConfig } from './app.config';
import { appConfig } from './app.config';
import type { ServiceConfig } from './service/services.config';
import { serviceConfig } from './service/services.config';

export type INodeApplicationConfig = {
  server: ServerConfig;
  global_middleware: typeof middlewareConfig;
  app: IAppConfig;
  jwt: unknown;
  logging: Record<string, unknown>;
  services: ServiceConfig;
};

export const configLoader: () => INodeApplicationConfig = () => {
  return {
    server: serverConfig(),
    global_middleware: middlewareConfig,
    app: appConfig(),
    jwt: {
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    logging: {},
    services: serviceConfig(),
  };
};
