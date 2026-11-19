/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Email } from '@/domain/app/email/models/email';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';

import { EmailLogService } from './email-log.service';

const EMAIL_ID = '65f1a2b3c4d5e6f708192a3b';

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

/**
 * Build a sent email.
 *
 * @returns {Email} The email.
 */
function sentEmail(): Email {
  return new Email({
    id: EMAIL_ID,
    user_id: '65f1a2b3c4d5e6f708192a3c',
    sent_on: new Date('2026-01-01T00:00:00.000Z'),
    to: ['user@example.com'],
    subject: 'Verify your email',
    body: '',
    status: 'sent',
    ttl: 600,
  });
}

describe('EmailLogService', () => {
  let repository: jest.Mocked<IEmailRepository>;
  let service: EmailLogService;

  beforeEach(() => {
    repository = mockRepository();
    service = new EmailLogService(repository);
  });

  describe('getAll', () => {
    it('returns the newest-first page for the given limit and offset', async () => {
      const emails = [sentEmail()];
      repository.findNewestFirst.mockResolvedValue(emails);

      await expect(service.getAll(10, 20)).resolves.toBe(emails);
      expect(repository.findNewestFirst).toHaveBeenCalledWith(10, 20, undefined);
    });

    it('maps a database outage to INFRASTRUCTURE_ERROR', async () => {
      repository.findNewestFirst.mockRejectedValue(new InfrastructureError('Mongo down', 'CONNECTION_ERROR'));

      await expect(service.getAll(10, 0)).rejects.toMatchObject({
        type: 'INFRASTRUCTURE_ERROR',
        data: { type: 'CONNECTION_ERROR' },
      });
    });
  });

  describe('getById', () => {
    it('returns the email with the given id', async () => {
      const email = sentEmail();
      repository.findById.mockResolvedValue(email);

      await expect(service.getById(EMAIL_ID)).resolves.toBe(email);
      expect(repository.findById).toHaveBeenCalledWith(EMAIL_ID, undefined);
    });

    it('throws NOT_FOUND when there is no email with the id', async () => {
      repository.findById.mockResolvedValue(null);

      const thrown = await service.getById(EMAIL_ID).catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(DomainServiceError);
      expect(thrown).toMatchObject({ type: 'NOT_FOUND' });
    });

    it('throws VALIDATION_ERROR for a malformed id', async () => {
      repository.findById.mockRejectedValue(new RepositoryError('Cast to ObjectId failed for "abc"', 'INVALID_ID'));

      await expect(service.getById('abc')).rejects.toMatchObject({ type: 'VALIDATION_ERROR' });
    });
  });
});
