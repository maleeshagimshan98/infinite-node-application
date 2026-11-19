/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { once } from 'events';

import express from 'express';

import { Email } from '@/domain/app/email/models/email';
import { EmailLogService } from '@/domain/app/email/service/email-log.service';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { EmailLogController } from './email-log.controller';

import type { Server } from 'http';
import type { Request, Response } from 'express';

const PENDING_ID = '65f1a2b3c4d5e6f708192a3b';
const FAILED_ID = '65f1a2b3c4d5e6f708192a3d';
const USER_ID = '65f1a2b3c4d5e6f708192a3c';
const ONE_TIME_CODE = '493817';
const TRANSPORT_ERROR = 'connect ECONNREFUSED 10.0.0.5:587';

const PENDING = new Email({
  id: PENDING_ID,
  version: 0,
  user_id: USER_ID,
  to: ['user@example.com'],
  subject: 'Verify your email',
  body: `Your code is ${ONE_TIME_CODE}`,
  status: 'pending',
  ttl: 600,
});

const FAILED = new Email({
  id: FAILED_ID,
  version: 1,
  user_id: USER_ID,
  to: ['user@example.com'],
  subject: 'Verify your email',
  body: '',
  status: 'failed',
  error_message: TRANSPORT_ERROR,
  ttl: 600,
});

/**
 * Build a mocked email repository with every method stubbed.
 *
 * @returns {jest.Mocked<IEmailRepository>} The mocked repository.
 */
function mockRepository(): jest.Mocked<IEmailRepository> {
  return {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findNewestFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('EmailLogController', () => {
  const logger: ILogger = {
    serviceName: () => 'logger',
    singleton: () => true,
    deferred: () => false,
    getDriver: () => null,
    logInfo: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logWarn: jest.fn(),
  };
  const repository = mockRepository();
  const controller = new EmailLogController(new EmailLogService(repository), repository, logger);
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.get('/emails', (req: Request, res: Response) => {
      void controller.getAll(req, res);
    });
    app.get('/emails/:id', (req: Request, res: Response) => {
      void controller.getById(req, res);
    });

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

  describe('getAll', () => {
    it('returns a paginated page of emails without their body or error message', async () => {
      repository.count.mockResolvedValue(2);
      repository.findNewestFirst.mockResolvedValue([PENDING, FAILED]);

      const response = await fetch(`${baseUrl}/emails?page=1&limit=10`);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(JSON.parse(text)).toMatchObject({
        paginated: true,
        data: [
          { id: PENDING_ID, user_id: USER_ID, status: 'pending', subject: 'Verify your email' },
          { id: FAILED_ID, status: 'failed' },
        ],
      });
      expect(text).not.toContain(ONE_TIME_CODE);
      expect(text).not.toContain(TRANSPORT_ERROR);
      expect(text).not.toContain('"body"');
      expect(text).not.toContain('"error_message"');
      expect(repository.findNewestFirst).toHaveBeenCalledWith(10, 0, undefined);
    });

    it('answers 400 without page and limit', async () => {
      repository.count.mockResolvedValue(2);

      const response = await fetch(`${baseUrl}/emails`);

      expect(response.status).toBe(400);
      expect(repository.findNewestFirst).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns the email without its body or error message', async () => {
      repository.findById.mockResolvedValue(FAILED);

      const response = await fetch(`${baseUrl}/emails/${FAILED_ID}`);
      const text = await response.text();

      expect(response.status).toBe(200);
      // ApiResponseUtils always sends `data` as an array, even for a single object.
      expect(JSON.parse(text)).toMatchObject({ data: [{ id: FAILED_ID, status: 'failed' }] });
      expect(text).not.toContain(TRANSPORT_ERROR);
      expect(text).not.toContain('"body"');
    });

    it('answers 404 for an unknown id', async () => {
      repository.findById.mockResolvedValue(null);

      const response = await fetch(`${baseUrl}/emails/${PENDING_ID}`);

      expect(response.status).toBe(404);
    });
  });
});
