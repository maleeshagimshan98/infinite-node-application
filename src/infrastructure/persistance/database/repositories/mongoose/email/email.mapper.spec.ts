/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { Email, NewEmail } from '@/domain/app/email/models/email';
import { DomainEntityError } from '@/domain/base/DomainEntityError';

import { PersistanceError } from '../../../errors/persistance.error';
import { EmailMapper } from './email.mapper';

import type { INewEmailSchema } from './email.model';

const USER_ID = '64b7f0c2a1b2c3d4e5f60718';
const EMAIL_ID = '64b7f0c2a1b2c3d4e5f60719';

const storedWithoutUser: INewEmailSchema & { _id: Types.ObjectId } = {
  _id: new Types.ObjectId(EMAIL_ID),
  to: ['user@example.com'],
  cc: ['manager@example.com'],
  bcc: [],
  subject: 'Verify your email',
  body: 'Your verification code is: 123456',
  status: 'pending',
  ttl: 3600,
};

const storedPending: INewEmailSchema & { _id: Types.ObjectId } = {
  ...storedWithoutUser,
  user_id: new Types.ObjectId(USER_ID),
};

describe('EmailMapper', () => {
  const mapper = new EmailMapper();

  describe('toDomain', () => {
    it('maps a stored pending email, turning the ObjectIds into strings', () => {
      const email = mapper.toDomain(storedPending);

      expect(email).toBeInstanceOf(Email);
      expect(email.toJSON()).toEqual({
        id: EMAIL_ID,
        user_id: USER_ID,
        sent_on: undefined,
        to: ['user@example.com'],
        cc: ['manager@example.com'],
        bcc: [],
        subject: 'Verify your email',
        body: 'Your verification code is: 123456',
        status: 'pending',
        error_message: undefined,
        ttl: 3600,
      });
    });

    it('keeps sent_on and error_message when they are stored', () => {
      const sentOn = new Date('2026-10-29T10:00:00Z');

      expect(mapper.toDomain({ ...storedPending, status: 'sent', sent_on: sentOn, body: '' }).sent_on).toBe(sentOn);
      expect(
        mapper.toDomain({ ...storedPending, status: 'failed', error_message: 'Mailbox unavailable', body: '' })
          .error_message,
      ).toBe('Mailbox unavailable');
    });

    it('throws a DomainEntityError for a stored sent email without sent_on', () => {
      expect(() => mapper.toDomain({ ...storedPending, status: 'sent', body: '' })).toThrow(DomainEntityError);
    });

    it('throws a PersistanceError for a stored email without user_id', () => {
      expect(() => mapper.toDomain(storedWithoutUser)).toThrow(PersistanceError);
    });
  });

  describe('toPersistence', () => {
    const newEmail = new NewEmail({
      user_id: USER_ID,
      to: ['user@example.com'],
      subject: 'Verify your email',
      body: 'Your verification code is: 123456',
      status: 'pending',
      ttl: 3600,
    });

    it('omits _id and the unset optional fields for a new email', () => {
      const { user_id: userId, ...rest } = mapper.toPersistence(newEmail);

      expect(userId).toBeInstanceOf(Types.ObjectId);
      expect(userId?.toString()).toBe(USER_ID);
      expect(rest).toEqual({
        to: ['user@example.com'],
        cc: [],
        bcc: [],
        subject: 'Verify your email',
        body: 'Your verification code is: 123456',
        status: 'pending',
        ttl: 3600,
      });
      expect(rest).not.toHaveProperty('_id');
      expect(rest).not.toHaveProperty('sent_on');
      expect(rest).not.toHaveProperty('error_message');
    });

    it('converts the id of a stored email to an ObjectId', () => {
      const email = new Email({
        id: EMAIL_ID,
        user_id: USER_ID,
        to: ['user@example.com'],
        subject: 'Verify your email',
        body: '',
        status: 'failed',
        error_message: 'Mailbox unavailable',
        ttl: 3600,
      });

      const persisted = mapper.toPersistence(email);

      expect(persisted._id).toBeInstanceOf(Types.ObjectId);
      expect(persisted._id?.toString()).toBe(EMAIL_ID);
      expect(persisted.error_message).toBe('Mailbox unavailable');
    });
  });

  describe('toFilter', () => {
    it('keeps only the given fields, without default lists or a user_id', () => {
      expect(mapper.toFilter({ status: 'pending' })).toEqual({ status: 'pending' });
    });

    it('converts a user_id filter to an ObjectId', () => {
      const filter = mapper.toFilter({ user_id: USER_ID });

      expect(Object.keys(filter)).toEqual(['user_id']);
      expect(filter.user_id?.toString()).toBe(USER_ID);
    });
  });
});
