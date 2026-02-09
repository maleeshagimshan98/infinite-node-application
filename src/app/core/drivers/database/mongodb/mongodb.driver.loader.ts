/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { MongoClient } from 'mongodb';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { type AwilixContainer } from 'awilix';
import { MongoDBDriver } from './mongodb.driver';
import { registerService } from '../../../service.container';
import { type IMongoDBConfig } from '../../../config/drivers/mongodb.config';

export const mongoDbDriverLoader = async (
  container: AwilixContainer,
  config: IMongoDBConfig,
): Promise<MongoDBDriver> => {
  try {
    const dbDriver = new MongoDBDriver();
    await dbDriver.init(container, config);
    const client: MongoClient | undefined = dbDriver.driver();
    registerService(config.driverName, 'singleton', client);
    if (!client || !(client instanceof MongoClient)) {
      throw new InfiniteNodeError('MongoDB client is not properly initialized.');
    }
    return dbDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load DatabaseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
