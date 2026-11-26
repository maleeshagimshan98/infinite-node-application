/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { APIResponse } from '@/app/core/utils/api-response/api-response';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { BaseController } from './base.controller';

import type { IncomingHttpHeaders } from 'http';

class TestController extends BaseController {
  run(error: unknown): Promise<APIResponse> {
    return this.catchExceptionsWrapper(async () => {
      throw error;
    });
  }

  /**
   * Run a versioned write the way a controller does, answering with the version it was given and an ETag.
   *
   * @param {IncomingHttpHeaders} headers - The request headers.
   * @param {number | undefined} sentVersion - The `version` sent in the body or the query.
   * @param {(version: number) => Promise<void>} write - The write.
   * @returns {Promise<APIResponse>} The response.
   */
  runWrite(
    headers: IncomingHttpHeaders,
    sentVersion: number | undefined,
    write: (version: number) => Promise<void>,
  ): Promise<APIResponse> {
    return this.catchExceptionsWrapper(async () => {
      let used = -1;
      await this.withExpectedVersion({ headers }, sentVersion, async (version) => {
        used = version;
        await write(version);
      });
      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'written',
        { version: used },
        this.entityTagHeader(used, { version: used }),
      );
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

  it('answers a CONFLICT DomainServiceError with 409 and its message', async () => {
    const message = 'The record was changed by another request. Reload it and try again.';
    const response = await controller.run(new DomainServiceError(message, 'CONFLICT'));

    expect(response.getCode()).toBe(409);
    expect(response.getMessage()).toBe(message);
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

  it('logs a server error through the logger only, as an error with its stack', async () => {
    const error = new InfrastructureError(RAW_DRIVER_MESSAGE, 'DATABASE_ERROR', undefined, {
      cause: new Error('socket hang up'),
    });

    await controller.run(error);

    expect(consoleLog).not.toHaveBeenCalled();
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

  it('logs a client error through the logger only, as a warning without a stack or its data', async () => {
    const error = new DomainServiceError('Password is too short', 'VALIDATION_ERROR', { password: 'hunter2' });

    await controller.run(error);

    expect(consoleLog).not.toHaveBeenCalled();
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

describe('BaseController versioned writes', () => {
  const controller = new TestController(createLogger());
  const conflict = (): Promise<void> =>
    Promise.reject(new DomainServiceError('The Role was changed by another request.', 'CONFLICT'));

  it('uses the version from If-Match and answers with an ETag', async () => {
    const response = await controller.runWrite({ 'if-match': '"3-abc"' }, undefined, async () => undefined);

    expect(response.getCode()).toBe(200);
    expect(response.getData()).toEqual([{ version: 3 }]);
    expect(response.getHeaders().ETag).toMatch(/^"3-[A-Za-z0-9_-]{16}"$/);
  });

  it('uses the sent version when there is no If-Match', async () => {
    const response = await controller.runWrite({}, 4, async () => undefined);

    expect(response.getData()).toEqual([{ version: 4 }]);
  });

  it('accepts If-Match and a version that agree', async () => {
    const response = await controller.runWrite({ 'if-match': '"4"' }, 4, async () => undefined);

    expect(response.getCode()).toBe(200);
  });

  it('answers 400 when neither If-Match nor a version is sent', async () => {
    const write = jest.fn(async () => undefined);
    const response = await controller.runWrite({}, undefined, write);

    expect(response.getCode()).toBe(400);
    expect(response.getMessage()).toMatch(/^version is required/);
    expect(write).not.toHaveBeenCalled();
  });

  it('treats If-Match: * as no version', async () => {
    const response = await controller.runWrite({ 'if-match': '*' }, undefined, async () => undefined);

    expect(response.getCode()).toBe(400);
  });

  it('answers 400 when If-Match and the version disagree, without writing', async () => {
    const write = jest.fn(async () => undefined);
    const response = await controller.runWrite({ 'if-match': '"3-abc"' }, 4, write);

    expect(response.getCode()).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });

  it('answers a CONFLICT for an If-Match version with 412', async () => {
    const response = await controller.runWrite({ 'if-match': '"3-abc"' }, undefined, conflict);

    expect(response.getCode()).toBe(412);
    expect(response.getMessage()).toBe('The Role was changed by another request.');
  });

  it('keeps 409 for a CONFLICT on a version sent in the body or the query', async () => {
    const response = await controller.runWrite({}, 3, conflict);

    expect(response.getCode()).toBe(409);
  });

  it('answers 412 for an If-Match that can never match, without writing', async () => {
    const write = jest.fn(async () => undefined);
    const response = await controller.runWrite({ 'if-match': 'W/"3"' }, undefined, write);

    expect(response.getCode()).toBe(412);
    expect(write).not.toHaveBeenCalled();
  });
});
