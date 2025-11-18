/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../../errors/InfiniteNodeError';
import { registerService } from '../../service.container';
import { type ILoggingConfig } from '../../../config/service/winston.config';
import { LoggingService } from './winston.service';
import type winston from 'winston';

export const winstonServiceLoader = async (
  container: AwilixContainer,
  config: ILoggingConfig,
): Promise<LoggingService> => {
  try {
    const winstonService = new LoggingService();
    await winstonService.init(container, config);
    const client = winstonService.service() as winston.Logger | undefined;
    if (!client || typeof client.info !== 'function') {
      throw new InfiniteNodeError('Logging client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return winstonService;
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load LoggingService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
