/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MongoClient } from 'mongodb';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { type AwilixContainer } from 'awilix';
import { MongoDBService } from './mongodb.service';
import { registerService } from '../../service.container';
import { type IMongoDBConfig } from '../../../config/service/mongodb.config';

export const mongoDbServiceLoader = async (
  container: AwilixContainer,
  config: IMongoDBConfig,
): Promise<MongoDBService> => {
  try {
    const dbService = new MongoDBService();
    await dbService.init(container, config);
    const client: MongoClient | undefined = dbService.service();
    registerService(config.serviceName, 'singleton', client);
    if (!client || !(client instanceof MongoClient)) {
      throw new InfiniteNodeError('MongoDB client is not properly initialized.');
    }
    return dbService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load DatabaseService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
