/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from './core.driver.config';

export interface ILoggingConfig extends IDriverConfig {
  winston: {
    fileName: string;
    datePattern: string;
    zippedArchive: boolean;
    maxSize: number;
    maxFiles: number;
    level: string;
    format: string;
    transports: Array<{
      type: string;
      options: {
        level?: string;
        format?: string;
        filename?: string;
      };
    }>;
  };
}

export const loggingConfig = (): ILoggingConfig => {
  const applicationLogFileName = process.env.WINSTON_LOG_FILE_NAME || './logs/application-%DATE%.log';
  const errorLogFileName = process.env.WINSTON_ERROR_LOG_FILE_NAME || './logs/error-%DATE%.log';
  return {
    driverName: 'logger',
    singleton: true,
    deferred: true,
    winston: {
      fileName: applicationLogFileName,
      datePattern: process.env.WINSTON_LOG_DATE_PATTERN || 'YYYY-MM-DD',
      zippedArchive: process.env.WINSTON_LOG_ZIPPED_ARCHIVE === 'true',
      maxSize: Number(process.env.WINSTON_LOG_MAX_SIZE) || 5242880,
      maxFiles: Number(process.env.WINSTON_LOG_MAX_FILES) || 5,
      level: process.env.WINSTON_LOG_LEVEL || 'info',
      format: process.env.WINSTON_LOG_FORMAT || 'json',
      transports: [
        {
          type: 'console',
          options: { level: 'info', format: 'simple' },
        },
        { type: 'file', options: { filename: applicationLogFileName, level: 'info', format: 'json' } },
        { type: 'file', options: { filename: errorLogFileName, level: 'error', format: 'json' } },
      ],
    },
  };
};
