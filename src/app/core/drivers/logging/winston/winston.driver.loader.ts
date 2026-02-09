/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../../../service.container';
import { type ILoggingConfig } from '../../../config/drivers/winston.config';
import { LoggingService } from './winston.driver';
import type winston from 'winston';

export const winstonDriverLoader = async (
  container: AwilixContainer,
  config: ILoggingConfig,
): Promise<LoggingService> => {
  try {
    const winstonDriver = new LoggingService();
    await winstonDriver.init(container, config);
    const client = winstonDriver.driver() as winston.Logger | undefined;
    if (!client || typeof client.info !== 'function') {
      throw new InfiniteNodeError('Logging driver is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return winstonDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load LoggingDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
