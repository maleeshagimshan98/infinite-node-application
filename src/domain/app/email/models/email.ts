/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '@/domain/base/DomainEntity';
import { DomainEntityError } from '@/domain/base/DomainEntityError';

export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface INewEmail {
  id?: string;
  user_id: string;
  sent_on?: Date;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  status: EmailStatus;
  error_message?: string;
  ttl: number;
}

export interface IEmail extends INewEmail {
  id: string;
}

/**
 * A record of one email the application sent or tried to send.
 *
 * The body is kept only while the email is pending: it can carry one-time codes that the auth flow
 * stores only as hashes, and nothing needs it once the email has been sent or has failed.
 */
export class NewEmail extends DomainEntity {
  protected _id?: string;
  protected _user_id: string;
  protected _sent_on?: Date;
  protected _to: string[];
  protected _cc: string[];
  protected _bcc: string[];
  protected _subject: string;
  protected _body: string;
  protected _status: EmailStatus;
  protected _error_message?: string;
  protected _ttl: number;

  constructor(data: INewEmail) {
    super();
    this.validate(data);
    if (data.id) {
      this._id = data.id;
    }
    this._user_id = data.user_id;
    if (data.sent_on) {
      this._sent_on = data.sent_on;
    }
    this._to = [...data.to];
    this._cc = data.cc ? [...data.cc] : [];
    this._bcc = data.bcc ? [...data.bcc] : [];
    this._subject = data.subject;
    this._body = data.body;
    this._status = data.status;
    if (data.error_message) {
      this._error_message = data.error_message;
    }
    this._ttl = data.ttl;
  }

  /**
   * Check the email data against the record's invariants.
   *
   * @param {INewEmail} data - The data the email is being constructed from.
   * @returns {void}
   * @throws {DomainEntityError} When there is no recipient, `ttl` is negative or not finite, a sent email has no
   * `sent_on`, a failed email has no `error_message`, or an email that is no longer pending still has a body.
   */
  private validate(data: INewEmail): void {
    if (data.to.length + (data.cc?.length ?? 0) + (data.bcc?.length ?? 0) === 0) {
      throw new DomainEntityError('An email needs at least one recipient in to, cc or bcc');
    }
    if (!Number.isFinite(data.ttl) || data.ttl < 0) {
      throw new DomainEntityError(`An email's ttl must be a finite number of seconds >= 0, got ${data.ttl}`);
    }
    if (data.status === 'sent' && !data.sent_on) {
      throw new DomainEntityError('A sent email needs sent_on');
    }
    if (data.status === 'failed' && !data.error_message) {
      throw new DomainEntityError('A failed email needs an error_message');
    }
    if (data.status !== 'pending' && data.body !== '') {
      throw new DomainEntityError(`A ${data.status} email must not keep its body`);
    }
  }

  get id(): string | undefined {
    return this._id;
  }

  /**
   * The user whose action triggered the email.
   */
  get user_id(): string {
    return this._user_id;
  }

  /**
   * When the transport accepted the email; set only once it is sent.
   */
  get sent_on(): Date | undefined {
    return this._sent_on;
  }

  get to(): string[] {
    return this._to;
  }

  get cc(): string[] {
    return this._cc;
  }

  get bcc(): string[] {
    return this._bcc;
  }

  get subject(): string {
    return this._subject;
  }

  /**
   * The email's content; empty once the email is no longer pending.
   */
  get body(): string {
    return this._body;
  }

  get status(): EmailStatus {
    return this._status;
  }

  /**
   * Why the send failed; set only once it has failed.
   */
  get error_message(): string | undefined {
    return this._error_message;
  }

  /**
   * Time-to-live in seconds, recorded with the email. Informational: it does not expire the record.
   */
  get ttl(): number {
    return this._ttl;
  }
}

export class Email extends NewEmail {
  protected _id: string;

  constructor(data: IEmail) {
    super(data);
    this._id = data.id;
  }

  get id(): string {
    return this._id;
  }

  /**
   * Mark the email as accepted by the transport and drop its body.
   *
   * @param {Date} [sentOn=new Date()] - When the transport accepted the email.
   * @returns {void}
   * @throws {DomainEntityError} When the email is not pending.
   */
  markSent(sentOn: Date = new Date()): void {
    this.assertPending('sent');
    this._status = 'sent';
    this._sent_on = sentOn;
    this._body = '';
  }

  /**
   * Mark the email as failed with the reason, and drop its body.
   *
   * @param {string} errorMessage - Why the send failed.
   * @returns {void}
   * @throws {DomainEntityError} When `errorMessage` is empty or the email is not pending.
   */
  markFailed(errorMessage: string): void {
    if (!errorMessage) {
      throw new DomainEntityError('A failed email needs an error_message');
    }
    this.assertPending('failed');
    this._status = 'failed';
    this._error_message = errorMessage;
    this._body = '';
  }

  /**
   * Allow a status change only from pending. Updates cannot clear a stored field, so a sent or failed email never
   * changes status again rather than carrying a stale sent_on or error_message.
   *
   * @param {EmailStatus} next - The status the caller wants to move to.
   * @returns {void}
   * @throws {DomainEntityError} When the email is not pending.
   */
  private assertPending(next: EmailStatus): void {
    if (this._status !== 'pending') {
      throw new DomainEntityError(`Only a pending email can be marked ${next}; this one is ${this._status}`);
    }
  }
}

export default Email;
