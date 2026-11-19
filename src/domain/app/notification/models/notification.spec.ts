/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntityError } from '@/domain/base/DomainEntityError';
import type { INotification } from '@/application/interfaces/infrastructure/notification/notification.interface';

import { NewNotification, Notification } from './notification';

import type { INewNotificationRecord } from './notification';

const pending: INewNotificationRecord = {
  triggered_by: 'order-service',
  triggered_on: new Date('2026-11-19T10:00:00Z'),
  topic: 'order.shipped',
  channel: 'push notification',
  service_provider: 'in_memory',
  data: { order_id: 'SO-1001' },
  status: 'pending',
};

/**
 * Build a logged pending notification.
 *
 * @returns {Notification} A pending notification with an id.
 */
function loggedPending(): Notification {
  const data: INotification = { ...pending, id: '64b7f0c2a1b2c3d4e5f60719' };
  return new Notification(data);
}

describe('NewNotification', () => {
  it('keeps every field and has no id until it is logged', () => {
    const notification = new NewNotification(pending);

    expect(notification.toJSON()).toEqual({ ...pending, id: undefined });
  });

  it('copies data, so a later change to the caller object does not reach the record', () => {
    const data: Record<string, unknown> = { order_id: 'SO-1001' };
    const notification = new NewNotification({ ...pending, data });
    data.order_id = 'SO-9999';

    expect(notification.data).toEqual({ order_id: 'SO-1001' });
  });

  it.each(['triggered_by', 'topic', 'service_provider'] as const)('rejects a blank %s', (field) => {
    expect(() => new NewNotification({ ...pending, [field]: '  ' })).toThrow(DomainEntityError);
  });

  it('rejects an invalid triggered_on date', () => {
    expect(() => new NewNotification({ ...pending, triggered_on: new Date('not a date') })).toThrow(DomainEntityError);
  });

  it('rejects triggered_on that is still a string, as it is after a JSON round trip', () => {
    const fromJson: INewNotificationRecord = JSON.parse(JSON.stringify(pending));

    expect(() => new NewNotification(fromJson)).toThrow(DomainEntityError);
  });

  it.each([
    ['channel', 'pager'],
    ['status', 'queued'],
  ])('rejects an unknown %s', (field, value) => {
    // JSON.parse returns `any`, which lets the test hand the entity a value its type rules out.
    const unchecked: INewNotificationRecord = { ...pending, ...JSON.parse(JSON.stringify({ [field]: value })) };

    expect(() => new NewNotification(unchecked)).toThrow(DomainEntityError);
  });
});

describe('Notification', () => {
  it('markSent moves a pending notification to sent', () => {
    const notification = loggedPending();

    notification.markSent();

    expect(notification.status).toBe('sent');
  });

  it('markFailed moves a pending notification to failed', () => {
    const notification = loggedPending();

    notification.markFailed();

    expect(notification.status).toBe('failed');
  });

  it.each([
    ['sent', (n: Notification): void => n.markSent()],
    ['failed', (n: Notification): void => n.markFailed()],
  ])('rejects any status change once the notification is %s', (_status, finish) => {
    const notification = loggedPending();
    finish(notification);

    expect(() => notification.markSent()).toThrow(DomainEntityError);
    expect(() => notification.markFailed()).toThrow(DomainEntityError);
  });
});
