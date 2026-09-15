/* eslint-env node */
/* global require, __dirname */
// Production ecosystem — runs the compiled dist/ output directly via node (no ts-node,
// no file watching). Run `npm run build` before `pm2 start ecosystem.prod.config.js`
// (or use `npm run start:all`, which builds first via the `prestart:all` hook).
//
// The app's own bootstrap (src/app/app.ts / src/app/worker.ts) intentionally skips
// dotenv-loading `.env.production` whenever NODE_ENV === 'production' — it expects the
// launching process to already have those variables in its environment, the same way
// Docker Compose's `env_file: .env.production` injects them before node ever starts.
// PM2 has no equivalent of `env_file`, so we load it here ourselves and merge it into
// each app's env block.
const path = require('path');
const dotenv = require('dotenv');

const { parsed: envProduction } = dotenv.config({ path: path.resolve(__dirname, '.env.production') });

module.exports = {
  apps: [
    {
      name: 'infinite-node-application',
      script: './dist/index.js',
      watch: false,
      env: {
        ...envProduction,
        NODE_ENV: 'production',
      },
    },
    {
      name: 'infinite-node-application-worker',
      script: './dist/worker.js',
      watch: false,
      env: {
        ...envProduction,
        NODE_ENV: 'production',
        WINSTON_LOG_FILE_NAME: './logs/worker-%DATE%.log',
        WINSTON_ERROR_LOG_FILE_NAME: './logs/worker-error-%DATE%.log',
      },
    },
  ],
};
