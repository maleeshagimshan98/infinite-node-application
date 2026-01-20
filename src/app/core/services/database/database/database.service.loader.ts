/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { IDatabaseConfig } from '../../../config/service/database.config';
import { DatabaseService } from './database.service';
import { InfiniteNodeError } from '../../../../errors/InfiniteNodeError';
import { registerService } from '../../service.container';

export const databaseServiceLoader = async (
  container: AwilixContainer,
  config: IDatabaseConfig,
): Promise<DatabaseService> => {
  try {
    const databaseService = new DatabaseService();
    await databaseService.init(container, config);
    const client = databaseService.service();
    if (!client) {
      throw new InfiniteNodeError('Database client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return databaseService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load DatabaseService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
