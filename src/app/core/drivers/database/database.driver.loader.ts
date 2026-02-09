/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { IDatabaseConfig } from '../../config/drivers/database.config';
import { DatabaseDriver } from './database.driver';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import { registerService } from '../service.container';

export const databaseDriverLoader = async (
  container: AwilixContainer,
  config: IDatabaseConfig,
): Promise<DatabaseDriver> => {
  try {
    const databaseDriver = new DatabaseDriver();
    await databaseDriver.init(container, config);
    const client = databaseDriver.driver();
    if (!client) {
      throw new InfiniteNodeError('Database client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return databaseDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load DatabaseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
