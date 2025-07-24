/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { asFunction } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { ILoggingConfig } from '../../config/service/logging.config';

export const loggingServiceLoader = (container: AwilixContainer, options: ILoggingConfig): void => {
  try {
    // Assuming LoggingService is defined and imported correctly
    const loggingService = 'new LoggingService()';
    container.register({
      loggingService: asFunction(() => loggingService).singleton(),
    });
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load LoggingService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
