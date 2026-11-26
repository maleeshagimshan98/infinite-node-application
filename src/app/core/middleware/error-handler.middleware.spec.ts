/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { once } from 'events';

import express from 'express';

import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { errorHandlerMiddleware } from './error-handler.middleware';
import { notFoundMiddleware } from './not-found.middleware';

import type { Server } from 'http';

describe('notFoundMiddleware and errorHandlerMiddleware', () => {
  let server: Server;
  let baseUrl: string;
  let logger: jest.Mocked<ILogger>;

  beforeAll(async () => {
    logger = {
      serviceName: jest.fn(() => 'logger' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
      logWarn: jest.fn(),
    };

    const app = express();
    app.use(express.json({ limit: '20b' }));
    app.post('/echo', (req, res) => {
      res.status(200).json(req.body);
    });
    app.get('/boom', (_req, _res, next) => {
      next(new Error('secret detail from the database'));
    });
    app.use(notFoundMiddleware());
    app.use(errorHandlerMiddleware(logger));

    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('The test server has no TCP address');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.close();
    await once(server, 'close');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('answers an unknown route with a JSON 404', async () => {
    const response = await fetch(`${baseUrl}/nope`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toMatchObject({
      status: 'error',
      code: 404,
      message: ErrorResponseMessages.NOT_FOUND_ERROR(),
    });
  });

  it('answers a body that is not valid JSON with a JSON 400, logged as a warning', async () => {
    const response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 400, message: ErrorResponseMessages.MALFORMED_REQUEST_BODY() });
    expect(logger.logWarn).toHaveBeenCalledTimes(1);
    expect(logger.logError).not.toHaveBeenCalled();
  });

  it('answers a body over the size limit with a JSON 413', async () => {
    const response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'far more than twenty bytes of JSON' }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: 413, message: ErrorResponseMessages.REQUEST_BODY_TOO_LARGE() });
  });

  it('answers any other error with the generic 500, never its message, and logs it with the stack', async () => {
    const response = await fetch(`${baseUrl}/boom`);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toMatchObject({ code: 500, message: ErrorResponseMessages.SERVER_ERROR() });
    expect(body).not.toContain('secret detail');
    expect(logger.logError).toHaveBeenCalledWith(
      expect.stringContaining('secret detail from the database'),
      expect.objectContaining({ statusCode: 500, stack: expect.any(String) }),
    );
  });

  it('still serves a valid request', async () => {
    const response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ a: 1 });
  });
});
