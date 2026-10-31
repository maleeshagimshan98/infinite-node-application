/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { Email, NewEmail } from '@/domain/app/email/models/email';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';

import { EmailLoggerService } from './email-logger.service';

const NEWEST_FIRST = { _id: -1 };

const pendingData = {
  user_id: '64b7f0c2a1b2c3d4e5f60718',
  to: ['user@example.com'],
  subject: 'Verify your email',
  body: 'Your verification code is: 123456',
  status: 'pending' as const,
  ttl: 3600,
};

/**
 * Build a repository whose every method is a jest mock.
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
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('EmailLoggerService', () => {
  let repository: jest.Mocked<IEmailRepository>;
  let service: EmailLoggerService;
  let email: Email;

  beforeEach(() => {
    repository = mockRepository();
    service = new EmailLoggerService(repository);
    email = new Email({ ...pendingData, id: '64b7f0c2a1b2c3d4e5f60719' });
  });

  it('newId returns a new ObjectId each time, without touching the repository', () => {
    const first = service.newId();
    const second = service.newId();

    expect(Types.ObjectId.isValid(first)).toBe(true);
    expect(second).not.toBe(first);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('getById returns the email with that id', async () => {
    repository.findById.mockResolvedValue(email);

    await expect(service.getById(email.id)).resolves.toBe(email);
    expect(repository.findById).toHaveBeenCalledWith(email.id);
  });

  it('getById returns null when there is no email with that id', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(email.id)).resolves.toBeNull();
  });

  it('getAll returns every email, newest first', async () => {
    repository.find.mockResolvedValue([email]);

    await expect(service.getAll()).resolves.toEqual([email]);
    expect(repository.find).toHaveBeenCalledWith({}, undefined, undefined, NEWEST_FIRST);
  });

  it('get returns one page, newest first', async () => {
    repository.find.mockResolvedValue([email]);

    await expect(service.get(20, 10)).resolves.toEqual([email]);
    expect(repository.find).toHaveBeenCalledWith({}, 10, 20, NEWEST_FIRST);
  });

  it.each([
    [-1, 10],
    [1.5, 10],
    [0, 0],
    [0, -5],
    [0, 2.5],
  ])('get(%p, %p) rejects with a RangeError without querying the repository', async (offset, limit) => {
    await expect(service.get(offset, limit)).rejects.toBeInstanceOf(RangeError);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('create logs the new email', async () => {
    const newEmail = new NewEmail(pendingData);
    repository.create.mockResolvedValue(email);

    await expect(service.create(newEmail)).resolves.toBe(email);
    expect(repository.create).toHaveBeenCalledWith(newEmail);
  });

  it("update saves the email under its id and returns the repository's result", async () => {
    email.markSent();
    repository.update.mockResolvedValue(email);

    await expect(service.update(email)).resolves.toBe(email);
    expect(repository.update).toHaveBeenCalledWith(email.id, email);
  });

  it('update returns null when there is no email with its id', async () => {
    repository.update.mockResolvedValue(null);

    await expect(service.update(email)).resolves.toBeNull();
  });

  it('passes repository errors through unchanged', async () => {
    const failure = new RepositoryError('email_log.findById failed: bad id', 'INVALID_ID');
    repository.findById.mockRejectedValue(failure);

    await expect(service.getById('not-an-id')).rejects.toBe(failure);
  });
});
