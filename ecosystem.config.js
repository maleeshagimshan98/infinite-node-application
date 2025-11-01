/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'infinite-node-application',
      script: './src/index.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register', // Load ts-node
      watch: true, // Enable file watching (optional)
      ignore_watch: ['node_modules'], // Ignore node_modules changes
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
