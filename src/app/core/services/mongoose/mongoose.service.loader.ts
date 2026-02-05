/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import { type IMongooseConfig } from '../../config/service/mongoose.config';
import { MongooseService } from './mongoose.service';
import type { Mongoose } from 'mongoose';

export const mongooseServiceLoader = async (
  container: AwilixContainer,
  config: IMongooseConfig,
): Promise<MongooseService> => {
  try {
    const mongooseService = new MongooseService();
    await mongooseService.init(container, config);
    const client = mongooseService.service() as Mongoose | undefined;
    if (!client || typeof client.connection !== 'object') {
      throw new InfiniteNodeError('Mongoose client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return mongooseService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load MongooseService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
