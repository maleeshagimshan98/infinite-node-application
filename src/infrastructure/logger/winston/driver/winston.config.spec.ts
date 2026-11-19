/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { winstonConfig } from './winston.config';

import type { IWinstonConfig } from './winston.config';

const LOG_FILE_ENV = [
  'INSTANCE_TYPE',
  'WINSTON_LOG_FILE_NAME',
  'WINSTON_ERROR_LOG_FILE_NAME',
  'WINSTON_APP_WORKER_LOG_FILE_NAME',
  'WINSTON_APP_WORKER_ERROR_LOG_FILE_NAME',
];

/**
 * Collect the file names a Winston config writes to.
 *
 * @param {IWinstonConfig} config - The config under test.
 * @returns {{ fileName: string; transportFiles: (string | undefined)[] }} The main file name and each file
 * transport's file name, in order (application log first, error log second).
 */
const fileNames = (config: IWinstonConfig): { fileName: string; transportFiles: (string | undefined)[] } => ({
  fileName: config.winston.fileName,
  transportFiles: config.winston.transports
    .filter((transport) => transport.type === 'file')
    .map((transport) => transport.options.filename),
});

describe('winstonConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of LOG_FILE_ENV) {
      delete process.env[name];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('writes to the application log files when INSTANCE_TYPE is unset', () => {
    expect(fileNames(winstonConfig())).toEqual({
      fileName: './logs/application-%DATE%.log',
      transportFiles: ['./logs/application-%DATE%.log', './logs/error-%DATE%.log'],
    });
  });

  it('writes to the worker log files when INSTANCE_TYPE is WORKER', () => {
    process.env.INSTANCE_TYPE = 'WORKER';

    expect(fileNames(winstonConfig())).toEqual({
      fileName: './logs/worker-%DATE%.log',
      transportFiles: ['./logs/worker-%DATE%.log', './logs/worker-error-%DATE%.log'],
    });
  });

  it('reads the worker file names, not the application ones, for a worker', () => {
    process.env.INSTANCE_TYPE = 'WORKER';
    process.env.WINSTON_LOG_FILE_NAME = './logs/app.log';
    process.env.WINSTON_ERROR_LOG_FILE_NAME = './logs/app-error.log';
    process.env.WINSTON_APP_WORKER_LOG_FILE_NAME = './logs/jobs.log';
    process.env.WINSTON_APP_WORKER_ERROR_LOG_FILE_NAME = './logs/jobs-error.log';

    expect(fileNames(winstonConfig())).toEqual({
      fileName: './logs/jobs.log',
      transportFiles: ['./logs/jobs.log', './logs/jobs-error.log'],
    });
  });

  it('reads the application file names, not the worker ones, for the app', () => {
    process.env.INSTANCE_TYPE = 'APP';
    process.env.WINSTON_LOG_FILE_NAME = './logs/app.log';
    process.env.WINSTON_ERROR_LOG_FILE_NAME = './logs/app-error.log';
    process.env.WINSTON_APP_WORKER_LOG_FILE_NAME = './logs/jobs.log';
    process.env.WINSTON_APP_WORKER_ERROR_LOG_FILE_NAME = './logs/jobs-error.log';

    expect(fileNames(winstonConfig())).toEqual({
      fileName: './logs/app.log',
      transportFiles: ['./logs/app.log', './logs/app-error.log'],
    });
  });
});
