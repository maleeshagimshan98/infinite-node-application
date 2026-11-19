import fs from 'fs';

export interface ServerConfig {
  ssl: boolean;
  sslOptions: {
    key: Buffer | null;
    cert: Buffer | null;
  };
}

/**
 * Build the server configuration from the environment: whether SSL is on, and the key and certificate read from
 * `SSL_KEY_PATH` / `SSL_CERT_PATH`.
 *
 * @returns {ServerConfig} The server configuration.
 * @throws {Error} when an SSL key or certificate file cannot be read.
 */
export const serverConfig = (): ServerConfig => {
  return {
    ssl: process.env.SSL_ENABLED === 'true',
    sslOptions: {
      key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : null,
      cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : null,
    },
  };
};
