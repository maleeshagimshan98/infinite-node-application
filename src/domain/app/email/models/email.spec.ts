/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntityError } from '@/domain/base/DomainEntityError';

import { Email, NewEmail } from './email';

import type { IEmail, INewEmail } from './email';

const pending: INewEmail = {
  user_id: '64b7f0c2a1b2c3d4e5f60718',
  to: ['user@example.com'],
  subject: 'Verify your email',
  body: 'Your verification code is: 123456',
  status: 'pending',
  ttl: 3600,
};

/**
 * Build a persisted pending email.
 *
 * @returns {Email} A pending email with an id.
 */
function persistedPending(): Email {
  const data: IEmail = { ...pending, id: '64b7f0c2a1b2c3d4e5f60719' };
  return new Email(data);
}

describe('NewEmail', () => {
  it('defaults cc and bcc to empty lists and copies the recipient lists', () => {
    const to = ['user@example.com'];
    const email = new NewEmail({ ...pending, to });
    to.push('other@example.com');

    expect(email.to).toEqual(['user@example.com']);
    expect(email.cc).toEqual([]);
    expect(email.bcc).toEqual([]);
  });

  it('accepts an email whose only recipient is in bcc', () => {
    expect(new NewEmail({ ...pending, to: [], bcc: ['audit@example.com'] }).bcc).toEqual(['audit@example.com']);
  });

  it('rejects an email without recipients', () => {
    expect(() => new NewEmail({ ...pending, to: [], cc: [], bcc: [] })).toThrow(DomainEntityError);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects a ttl of %p', (ttl) => {
    expect(() => new NewEmail({ ...pending, ttl })).toThrow(DomainEntityError);
  });

  it('rejects a sent email without sent_on', () => {
    expect(() => new NewEmail({ ...pending, status: 'sent', body: '' })).toThrow(DomainEntityError);
  });

  it('rejects a failed email without an error_message', () => {
    expect(() => new NewEmail({ ...pending, status: 'failed', body: '' })).toThrow(DomainEntityError);
  });

  it.each(['sent', 'failed'] as const)('rejects a %s email that still has a body', (status) => {
    expect(
      () => new NewEmail({ ...pending, status, sent_on: new Date(), error_message: 'Mailbox unavailable' }),
    ).toThrow(DomainEntityError);
  });

  it('accepts a sent email with sent_on and no body', () => {
    const sentOn = new Date('2026-10-29T10:00:00Z');
    const email = new NewEmail({ ...pending, status: 'sent', sent_on: sentOn, body: '' });

    expect(email.sent_on).toBe(sentOn);
    expect(email.error_message).toBeUndefined();
  });
});

describe('Email', () => {
  it('markSent records when the email was sent and drops its body', () => {
    const email = persistedPending();
    const sentOn = new Date('2026-10-29T10:00:00Z');

    email.markSent(sentOn);

    expect(email.status).toBe('sent');
    expect(email.sent_on).toBe(sentOn);
    expect(email.body).toBe('');
  });

  it('markSent defaults sent_on to now', () => {
    const before = Date.now();
    const email = persistedPending();

    email.markSent();

    expect(email.sent_on?.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('markFailed records the reason and drops the body', () => {
    const email = persistedPending();

    email.markFailed('Mailbox unavailable');

    expect(email.status).toBe('failed');
    expect(email.error_message).toBe('Mailbox unavailable');
    expect(email.sent_on).toBeUndefined();
    expect(email.body).toBe('');
  });

  it('markFailed rejects an empty reason and leaves the email pending', () => {
    const email = persistedPending();

    expect(() => email.markFailed('')).toThrow(DomainEntityError);
    expect(email.status).toBe('pending');
  });

  it('allows no status change once the email has left pending', () => {
    const sent = persistedPending();
    sent.markSent();
    const failed = persistedPending();
    failed.markFailed('Mailbox unavailable');

    expect(() => sent.markFailed('Mailbox unavailable')).toThrow(DomainEntityError);
    expect(() => sent.markSent()).toThrow(DomainEntityError);
    expect(() => failed.markSent()).toThrow(DomainEntityError);
    expect(sent.error_message).toBeUndefined();
    expect(failed.sent_on).toBeUndefined();
  });
});
