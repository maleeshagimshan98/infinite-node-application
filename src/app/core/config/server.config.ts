import fs from 'fs';

export interface ServerConfig {
  ssl: boolean;
  sslOptions: {
    key: Buffer | null;
    cert: Buffer | null;
  };
}

export const serverConfig = (): ServerConfig => {
  return {
    ssl: process.env.SSL_ENABLED === 'true',
    sslOptions: {
      key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : null,
      cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : null,
    },
  };
};
