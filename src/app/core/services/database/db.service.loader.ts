/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mysql from 'mysql';
import mongodb from 'mongodb';
import type { IDatabaseConfig } from '../../config/service/database.config';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { asFunction, type AwilixContainer } from 'awilix';

export const dbServiceLoader = (container: AwilixContainer, dbConfig: IDatabaseConfig): void => {
  try {
    if (dbConfig.driver === 'mysql') {
      const client = mysql.createConnection(dbConfig.mysql);
      client.on('error', (err) => console.log('MySQL Client Error', err));
      //... Handle errors
      container.register({
        dbClient: asFunction(() => client).singleton(),
      });
    }
    if (dbConfig.driver === 'mongodb') {
      const client = new mongodb.MongoClient(dbConfig.mongodb.uri);
      client.on('error', (err) => console.log('MongoDB Client Error', err));
      container.register({
        dbClient: asFunction(() => client).singleton(),
      });
    }
    throw new InfiniteNodeError(`DB driver "${dbConfig.driver}" is not supported.`);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load DatabaseService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
