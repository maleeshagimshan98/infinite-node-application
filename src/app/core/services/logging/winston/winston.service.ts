/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICoreService } from '../../core.service';
import type { ILoggingConfig } from '../../../config/service/winston.config';
import type { AwilixContainer } from 'awilix';
import winston from 'winston';
import 'winston-daily-rotate-file';

export class LoggingService implements ICoreService<ILoggingConfig> {
  private logger: winston.Logger | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: ILoggingConfig): Promise<void> {
    const transports: winston.transport[] = [];

    // Configure transports from config
    for (const t of config.winston.transports) {
      if (t.type === 'console') {
        transports.push(
          new winston.transports.Console({
            level: t.options.level ?? config.winston.level,
            format:
              t.options.format === 'simple'
                ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                : winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        );
      }
      if (t.type === 'file') {
        const filename = t.options.filename ?? config.winston.fileName;
        // Use DailyRotateFile when filename contains a date pattern placeholder
        transports.push(
          new (
            winston.transports as unknown as {
              DailyRotateFile: new (opts: unknown) => winston.transport;
            }
          ).DailyRotateFile({
            filename,
            datePattern: config.winston.datePattern,
            zippedArchive: config.winston.zippedArchive,
            maxSize: config.winston.maxSize,
            maxFiles: config.winston.maxFiles,
            level: t.options.level ?? config.winston.level,
            format:
              t.options.format === 'simple'
                ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                : winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }) as unknown as winston.transport,
        );
      }
    }

    this.logger = winston.createLogger({
      level: config.winston.level,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports,
    });
  }

  service(): winston.Logger | undefined {
    return this.logger;
  }

  async shutdown(): Promise<void> {
    if (!this.logger) return;
    this.logger.close();
    this.logger = undefined;
  }
}
