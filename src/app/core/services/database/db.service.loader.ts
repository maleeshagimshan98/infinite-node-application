/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mysql from 'mysql';
import { MongoClient } from 'mongodb';
import type { IDatabaseConfig } from '../../config/service/database.config';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { type AwilixContainer } from 'awilix';
import { registerService } from '../service.container';

export const dbServiceLoader = (name: string, container: AwilixContainer, dbConfig: IDatabaseConfig): void => {
  try {
    if (dbConfig.driver === 'mysql') {
      const client = mysql.createConnection(dbConfig.mysql);
      client.on('error', (err) => {
        throw new Error('MySQL Client Error', err);
      });
      registerService(name, container, dbConfig, client);
      //... Handle errors
      return;
    }
    if (dbConfig.driver === 'mongodb') {
      const client = new MongoClient(dbConfig.mongodb.uri);
      client.on('error', (err) => {
        throw new Error('MongoDB Client Error', err);
      });
      registerService(name, container, dbConfig, client);
      return;
    }
    throw new InfiniteNodeError(`DB driver "${dbConfig.driver}" is not supported.`);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load DatabaseService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
