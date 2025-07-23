/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface DatabaseConfig {
  uri: string;
  options: {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
    useCreateIndex: boolean;
    useFindAndModify: boolean;
  };
}

export function databaseConfig(): DatabaseConfig {
  return {
    uri: process.env.DATABASE_SERVER_URI || 'mongodb://localhost:27017/infinite-node',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    },
  };
}
