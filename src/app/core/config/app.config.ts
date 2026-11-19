/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IAppConfig {
  name: string;
  version: string;
  environment: string;
  baseUrl: string;
  apiUrlPrefix: string;
  port: number | string;
}

/**
 * Build the application metadata from the environment (`APP_*`, `NODE_ENV`, `API_URL_PREFIX`, `NODE_PORT`), with
 * local defaults.
 *
 * @returns {IAppConfig} The application metadata.
 */
export const appConfig = (): IAppConfig => ({
  name: process.env.APP_NAME || 'Infinite Node Application',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  apiUrlPrefix: process.env.API_URL_PREFIX || '/api/v1/',
  port: process.env.NODE_PORT || 3000,
});
