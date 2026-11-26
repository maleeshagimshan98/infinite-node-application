/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type {
  INotification,
  INotificationChannel,
  INotificationStatus,
} from '@/application/interfaces/infrastructure/notification/notification.interface';
import { DomainEntity } from '@/domain/base/DomainEntity';
import { DomainEntityError } from '@/domain/base/DomainEntityError';

/** Every channel a notification can go out on. The notification log's schema accepts only these. */
export const NOTIFICATION_CHANNELS: readonly INotificationChannel[] = ['email', 'sms', 'push notification', 'webhook'];

/** Every status a logged notification can have. The notification log's schema accepts only these. */
export const NOTIFICATION_STATUSES: readonly INotificationStatus[] = ['pending', 'sent', 'failed'];

/**
 * A notification record that is not logged yet. The id is optional: the log assigns one unless the notification
 * was given one when it was queued.
 *
 * Named apart from `INewNotification` (`notification.interface.ts`), which is what callers will hand to the
 * planned notification manager.
 */
export type INewNotificationRecord = Omit<INotification, 'id'> & { id?: string; version?: number };

/**
 * A logged notification as the repository reads it: the record plus its version, the number of times it has been
 * updated. The version is a persistence concern, so `INotification` leaves it out.
 */
export type INotificationRecord = INotification & { version: number };

/**
 * A record of one notification the application sent, or tried to send, on one channel. Sending the same
 * notification on several channels gives one record per channel.
 */
export class NewNotification extends DomainEntity {
  protected _id?: string;
  protected _version?: number;
  protected _triggered_by: string;
  protected _triggered_on: Date;
  protected _topic: string;
  protected _channel: INotificationChannel;
  protected _service_provider: string;
  protected _data: Record<string, unknown>;
  protected _status: INotificationStatus;

  constructor(data: INewNotificationRecord) {
    super();
    this.validate(data);
    if (data.id) {
      this._id = data.id;
    }
    if (data.version !== undefined) {
      this._version = NewNotification.checkVersion(data.version);
    }
    this._triggered_by = data.triggered_by;
    this._triggered_on = data.triggered_on;
    this._topic = data.topic;
    this._channel = data.channel;
    this._service_provider = data.service_provider;
    this._data = { ...data.data };
    this._status = data.status;
  }

  /**
   * Check the notification data against the record's invariants.
   *
   * @param {INewNotificationRecord} data - The data the notification is being constructed from.
   * @returns {void}
   * @throws {DomainEntityError} When `triggered_by`, `topic` or `service_provider` is blank, `triggered_on` is not a
   * valid Date, or `channel` or `status` is not a known value.
   */
  private validate(data: INewNotificationRecord): void {
    for (const field of ['triggered_by', 'topic', 'service_provider'] as const) {
      if (data[field].trim() === '') {
        throw new DomainEntityError(`A notification needs a non-empty ${field}`);
      }
    }
    // A queued notification comes back from its JSON job data with triggered_on as a string; it must be a Date again.
    if (!(data.triggered_on instanceof Date) || Number.isNaN(data.triggered_on.getTime())) {
      throw new DomainEntityError('A notification needs triggered_on as a valid Date');
    }
    if (!NOTIFICATION_CHANNELS.includes(data.channel)) {
      throw new DomainEntityError(`Unknown notification channel: ${data.channel}`);
    }
    if (!NOTIFICATION_STATUSES.includes(data.status)) {
      throw new DomainEntityError(`Unknown notification status: ${data.status}`);
    }
  }

  get id(): string | undefined {
    return this._id;
  }

  get version(): number | undefined {
    return this._version;
  }

  /**
   * The name of the service that triggered the notification.
   */
  get triggered_by(): string {
    return this._triggered_by;
  }

  /**
   * When the triggering service asked for the notification to be sent.
   */
  get triggered_on(): Date {
    return this._triggered_on;
  }

  get topic(): string {
    return this._topic;
  }

  get channel(): INotificationChannel {
    return this._channel;
  }

  /**
   * The notification driver that delivers it, e.g. `in_memory`, `aws_sns` or `fcm`.
   */
  get service_provider(): string {
    return this._service_provider;
  }

  /**
   * The notification's payload. A shallow copy of what it was constructed with.
   */
  get data(): Record<string, unknown> {
    return this._data;
  }

  get status(): INotificationStatus {
    return this._status;
  }
}

/**
 * A logged notification. Its status moves once, from `pending` to `sent` or `failed`.
 */
export class Notification extends NewNotification implements INotification {
  protected _id: string;
  protected _version: number;

  constructor(data: INotificationRecord) {
    super(data);
    this._id = data.id;
    // Redeclared fields are reset after super() returns, so assign it here, as _id is.
    this._version = Notification.checkVersion(data.version);
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  /**
   * Mark the notification as delivered by its service provider.
   *
   * @returns {void}
   * @throws {DomainEntityError} When the notification is not pending.
   */
  markSent(): void {
    this.assertPending('sent');
    this._status = 'sent';
  }

  /**
   * Mark the notification as failed: its service provider did not deliver it, and it will not be tried again.
   *
   * @returns {void}
   * @throws {DomainEntityError} When the notification is not pending.
   */
  markFailed(): void {
    this.assertPending('failed');
    this._status = 'failed';
  }

  /**
   * Allow a status change only from pending, so a job that runs again can neither send a finished notification a
   * second time nor relabel a sent one as failed.
   *
   * @param {INotificationStatus} next - The status the caller wants to move to.
   * @returns {void}
   * @throws {DomainEntityError} When the notification is not pending.
   */
  private assertPending(next: INotificationStatus): void {
    if (this._status !== 'pending') {
      throw new DomainEntityError(`Only a pending notification can be marked ${next}; this one is ${this._status}`);
    }
  }
}

export default Notification;
