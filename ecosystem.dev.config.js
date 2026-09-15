/* eslint-env node */
// Development ecosystem — runs TypeScript sources directly via ts-node (no build step),
// with tsconfig-paths registered so `@/` aliases resolve, and file watching enabled.
module.exports = {
  apps: [
    {
      name: 'infinite-node-application',
      script: './src/index.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register',
      watch: true,
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'infinite-node-application-worker',
      script: './src/worker.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register',
      watch: true,
      ignore_watch: ['node_modules', 'logs'],
      env: {
        NODE_ENV: 'development',
        WINSTON_LOG_FILE_NAME: './logs/worker-%DATE%.log',
        WINSTON_ERROR_LOG_FILE_NAME: './logs/worker-error-%DATE%.log',
      },
    },
  ],
};
