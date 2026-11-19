/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { NewNotification, Notification } from '@/domain/app/notification/models/notification';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';
import type { INotificationRepository } from '@/application/interfaces/repositories/notification/notification.repository.interface';

import { NotificationLoggerService } from './notification-logger.service';

const NEWEST_FIRST = { _id: -1 };

const pendingData = {
  triggered_by: 'order-service',
  triggered_on: new Date('2026-11-19T10:00:00Z'),
  topic: 'order.shipped',
  channel: 'push notification' as const,
  service_provider: 'in_memory',
  data: { order_id: 'SO-1001' },
  status: 'pending' as const,
};

/**
 * Build a repository whose every method is a jest mock.
 *
 * @returns {jest.Mocked<INotificationRepository>} The mocked repository.
 */
function mockRepository(): jest.Mocked<INotificationRepository> {
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

describe('NotificationLoggerService', () => {
  let repository: jest.Mocked<INotificationRepository>;
  let service: NotificationLoggerService;
  let notification: Notification;

  beforeEach(() => {
    repository = mockRepository();
    service = new NotificationLoggerService(repository);
    notification = new Notification({ ...pendingData, id: '64b7f0c2a1b2c3d4e5f60719' });
  });

  it('newId returns a new ObjectId each time, without touching the repository', () => {
    const first = service.newId();
    const second = service.newId();

    expect(Types.ObjectId.isValid(first)).toBe(true);
    expect(second).not.toBe(first);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('getById returns the notification with that id', async () => {
    repository.findById.mockResolvedValue(notification);

    await expect(service.getById(notification.id)).resolves.toBe(notification);
    expect(repository.findById).toHaveBeenCalledWith(notification.id);
  });

  it('getById returns null when there is no notification with that id', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(notification.id)).resolves.toBeNull();
  });

  it('getAll returns every notification, newest first', async () => {
    repository.find.mockResolvedValue([notification]);

    await expect(service.getAll()).resolves.toEqual([notification]);
    expect(repository.find).toHaveBeenCalledWith({}, undefined, undefined, NEWEST_FIRST);
  });

  it('get returns one page, newest first', async () => {
    repository.find.mockResolvedValue([notification]);

    await expect(service.get(20, 10)).resolves.toEqual([notification]);
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

  it('create logs the new notification', async () => {
    const newNotification = new NewNotification(pendingData);
    repository.create.mockResolvedValue(notification);

    await expect(service.create(newNotification)).resolves.toBe(notification);
    expect(repository.create).toHaveBeenCalledWith(newNotification);
  });

  it("update saves the notification under its id and returns the repository's result", async () => {
    notification.markSent();
    repository.update.mockResolvedValue(notification);

    await expect(service.update(notification)).resolves.toBe(notification);
    expect(repository.update).toHaveBeenCalledWith(notification.id, notification);
  });

  it('update returns null when there is no notification with its id', async () => {
    repository.update.mockResolvedValue(null);

    await expect(service.update(notification)).resolves.toBeNull();
  });

  it('passes repository errors through unchanged', async () => {
    const failure = new RepositoryError('notification_log.findById failed: bad id', 'INVALID_ID');
    repository.findById.mockRejectedValue(failure);

    await expect(service.getById('not-an-id')).rejects.toBe(failure);
  });
});
