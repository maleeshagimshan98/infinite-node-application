/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { APIResponse } from '@/app/core/utils/api-response/api-response';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { BaseController } from './base.controller';

class TestController extends BaseController {
  run(error: unknown): Promise<APIResponse> {
    return this.catchExceptionsWrapper(async () => {
      throw error;
    });
  }
}

const RAW_DRIVER_MESSAGE =
  'E11000 duplicate key error collection: app.users index: email_1 dup key: { email: "a@b.c" }';

const createLogger = (): jest.Mocked<ILogger> => ({
  serviceName: jest.fn(() => 'logger' as const),
  singleton: jest.fn(() => true as const),
  deferred: jest.fn(() => false as const),
  getDriver: jest.fn(() => null),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
});

describe('BaseController error responses', () => {
  const controller = new TestController(createLogger());

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a generic 500 for an InfrastructureError without exposing its message', async () => {
    const response = await controller.run(new InfrastructureError(RAW_DRIVER_MESSAGE, 'DATABASE_ERROR'));

    expect(response.getCode()).toBe(500);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVER_ERROR());
    expect(response.toJson()).not.toContain('E11000');
  });

  it('returns a generic 503 for a connection InfrastructureError', async () => {
    const response = await controller.run(
      new InfrastructureError('connect ECONNREFUSED 10.0.0.5:27017', 'CONNECTION_ERROR'),
    );

    expect(response.getCode()).toBe(503);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVICE_UNAVAILABLE());
    expect(response.toJson()).not.toContain('10.0.0.5');
  });

  it('returns a generic 503 for an INFRASTRUCTURE_ERROR DomainServiceError of network type', async () => {
    const response = await controller.run(
      new DomainServiceError(RAW_DRIVER_MESSAGE, 'INFRASTRUCTURE_ERROR', { type: 'NETWORK_ERROR' }),
    );

    expect(response.getCode()).toBe(503);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVICE_UNAVAILABLE());
    expect(response.toJson()).not.toContain('E11000');
  });

  it('returns a generic 500 for an INFRASTRUCTURE_ERROR DomainServiceError of database type', async () => {
    const response = await controller.run(
      new DomainServiceError(RAW_DRIVER_MESSAGE, 'INFRASTRUCTURE_ERROR', { type: 'DATABASE_ERROR' }),
    );

    expect(response.getCode()).toBe(500);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVER_ERROR());
    expect(response.toJson()).not.toContain('E11000');
  });

  it('keeps the domain-authored message for other DomainServiceError types', async () => {
    const response = await controller.run(new DomainServiceError('Role x not found', 'NOT_FOUND'));

    expect(response.getCode()).toBe(404);
    expect(response.getMessage()).toBe('Role x not found');
  });
});

describe('BaseController exception logging', () => {
  let logger: jest.Mocked<ILogger>;
  let controller: TestController;
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    logger = createLogger();
    controller = new TestController(logger);
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs a server error to the console and as an error with its stack', async () => {
    const error = new InfrastructureError(RAW_DRIVER_MESSAGE, 'DATABASE_ERROR', undefined, {
      cause: new Error('socket hang up'),
    });

    await controller.run(error);

    expect(consoleLog).toHaveBeenCalledWith(error);
    expect(logger.logWarn).not.toHaveBeenCalled();
    expect(logger.logError).toHaveBeenCalledWith(`Request failed with 500: ${RAW_DRIVER_MESSAGE}`, {
      statusCode: 500,
      infrastructureErrorType: 'DATABASE_ERROR',
      error: {
        name: 'InfrastructureError',
        message: RAW_DRIVER_MESSAGE,
        cause: { name: 'Error', message: 'socket hang up' },
        stack: error.stack,
      },
    });
  });

  it('records both error types of an INFRASTRUCTURE_ERROR DomainServiceError', async () => {
    await controller.run(
      new DomainServiceError('connect ECONNREFUSED', 'INFRASTRUCTURE_ERROR', { type: 'NETWORK_ERROR' }),
    );

    expect(logger.logError).toHaveBeenCalledWith(
      'Request failed with 503: connect ECONNREFUSED',
      expect.objectContaining({
        statusCode: 503,
        domainErrorType: 'INFRASTRUCTURE_ERROR',
        infrastructureErrorType: 'NETWORK_ERROR',
      }),
    );
  });

  it('logs a client error to the console and as a warning without a stack or its data', async () => {
    const error = new DomainServiceError('Password is too short', 'VALIDATION_ERROR', { password: 'hunter2' });

    await controller.run(error);

    expect(consoleLog).toHaveBeenCalledWith(error);
    expect(logger.logError).not.toHaveBeenCalled();
    expect(logger.logWarn).toHaveBeenCalledWith('Request failed with 400: Password is too short', {
      statusCode: 400,
      domainErrorType: 'VALIDATION_ERROR',
      error: { name: 'DomainServiceError', message: 'Password is too short' },
    });
  });

  it('logs a thrown non-Error value as an error', async () => {
    await controller.run('boom');

    expect(logger.logError).toHaveBeenCalledWith('Request failed with 500: boom', {
      statusCode: 500,
      error: { message: 'boom' },
    });
  });
});
