/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { ILoggingConfig } from '../../config/service/logging.config';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { registerService } from '../service.container';

export const loggingServiceLoader = (name: string, container: AwilixContainer, options: ILoggingConfig): void => {
  try {
    const winstonTransport = new winston.transports.DailyRotateFile({
      filename: './logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: options.winston.level || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    });

    const loggingService = winston.createLogger({
      level: options.winston.level || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [winstonTransport],
    });

    registerService(name, container, options, loggingService);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load LoggingService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
