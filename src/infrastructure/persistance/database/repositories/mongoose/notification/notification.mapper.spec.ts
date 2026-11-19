/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { NewNotification, Notification } from '@/domain/app/notification/models/notification';
import { DomainEntityError } from '@/domain/base/DomainEntityError';

import { NotificationMapper } from './notification.mapper';

import type { INewNotificationSchema } from './notification.model';

const NOTIFICATION_ID = '64b7f0c2a1b2c3d4e5f60719';
const TRIGGERED_ON = new Date('2026-11-19T10:00:00Z');

const fields = {
  triggered_by: 'order-service',
  triggered_on: TRIGGERED_ON,
  topic: 'order.shipped',
  channel: 'sms' as const,
  service_provider: 'in_memory',
  data: { order_id: 'SO-1001' },
  status: 'pending' as const,
};

const stored: INewNotificationSchema & { _id: Types.ObjectId } = {
  _id: new Types.ObjectId(NOTIFICATION_ID),
  ...fields,
};

describe('NotificationMapper', () => {
  const mapper = new NotificationMapper();

  describe('toDomain', () => {
    it('maps a stored notification, turning the ObjectId into a string', () => {
      const notification = mapper.toDomain(stored);

      expect(notification).toBeInstanceOf(Notification);
      expect(notification.toJSON()).toEqual({ id: NOTIFICATION_ID, ...fields });
    });

    it('throws a DomainEntityError for a stored notification that breaks an invariant', () => {
      expect(() => mapper.toDomain({ ...stored, topic: '' })).toThrow(DomainEntityError);
    });
  });

  describe('toPersistence', () => {
    it('omits _id for a new notification', () => {
      const persisted = mapper.toPersistence(new NewNotification(fields));

      expect(persisted).toEqual(fields);
      expect(persisted).not.toHaveProperty('_id');
    });

    it('converts the id of a logged notification to an ObjectId', () => {
      const persisted = mapper.toPersistence(new Notification({ ...fields, id: NOTIFICATION_ID, status: 'sent' }));

      expect(persisted._id).toBeInstanceOf(Types.ObjectId);
      expect(persisted._id?.toString()).toBe(NOTIFICATION_ID);
      expect(persisted.status).toBe('sent');
    });
  });

  describe('toFilter', () => {
    it('keeps only the given fields, without a default data object', () => {
      expect(mapper.toFilter({ status: 'pending', channel: 'sms' })).toEqual({ status: 'pending', channel: 'sms' });
    });

    it('converts an id filter to an ObjectId', () => {
      const filter = mapper.toFilter({ id: NOTIFICATION_ID });

      expect(Object.keys(filter)).toEqual(['_id']);
      expect(filter._id?.toString()).toBe(NOTIFICATION_ID);
    });
  });
});
