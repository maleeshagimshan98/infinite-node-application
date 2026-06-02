/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'infinite-node-application',
      script: './src/index.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register', // Load ts-node + path aliases
      watch: true, // Enable file watching (optional)
      ignore_watch: ['node_modules'], // Ignore node_modules changes
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'infinite-node-application-worker',
      script: './src/worker.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register', // Load ts-node + path aliases
      watch: true, // Enable file watching (optional)
      ignore_watch: ['node_modules', 'logs'], // Ignore node_modules and log files
      env: {
        NODE_ENV: 'development',
        WINSTON_LOG_FILE_NAME: './logs/worker-%DATE%.log',
        WINSTON_ERROR_LOG_FILE_NAME: './logs/worker-error-%DATE%.log',
      },
      env_production: {
        NODE_ENV: 'production',
        WINSTON_LOG_FILE_NAME: './logs/worker-%DATE%.log',
        WINSTON_ERROR_LOG_FILE_NAME: './logs/worker-error-%DATE%.log',
      },
    },
  ],
};
