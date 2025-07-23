/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ServerConfig } from './server.config';
import { serverConfig } from './server.config';
import { middlewareConfig } from './middleware.config';
import type { IAppConfig } from './app.config';
import { appConfig } from './app.config';
import type { DatabaseConfig } from './database.config';
import { databaseConfig } from './database.config';
import { serviceConfig } from './services.config';
import dotenv from 'dotenv';
dotenv.config();

export interface INodeApplicationConfig {
  server: ServerConfig;
  global_middleware: typeof middlewareConfig;
  app: IAppConfig;
  jwt: unknown;
  db: DatabaseConfig;
  logging: Record<string, unknown>;
  services: typeof serviceConfig;
}

export const config: INodeApplicationConfig = {
  server: serverConfig(),
  global_middleware: middlewareConfig,
  app: appConfig(),
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  db: databaseConfig(),
  logging: {},
  services: serviceConfig,
};
