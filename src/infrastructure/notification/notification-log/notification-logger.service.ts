/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { Notification, NewNotification } from '@/domain/app/notification/models/notification';
import type { INotificationRepository } from '@/application/interfaces/repositories/notification/notification.repository.interface';
import { NotificationRepository } from '@/infrastructure/persistance/database/repositories/mongoose/notification/notification.repository';

// ObjectIds start with their creation time, so sorting on _id orders notifications by when they were logged.
const NEWEST_FIRST: Record<string, 1 | -1> = { _id: -1 };

/**
 * Keeps the log of notifications the application sends or tries to send, one record per channel.
 *
 * Errors from the repository reach the caller unchanged.
 *
 * @class NotificationLoggerService
 *
 * @example
 * ```typescript
 * const notificationLogger = new NotificationLoggerService();
 * const notification = await notificationLogger.create(new NewNotification({ ...data, status: 'pending' }));
 * notification.markSent();
 * await notificationLogger.update(notification);
 * ```
 */
export class NotificationLoggerService {
  constructor(private readonly notificationRepository: INotificationRepository = new NotificationRepository()) {}

  /**
   * Generate an id for a notification that is not logged yet, so it can be logged under that id later.
   *
   * @returns {string} A new id, unique to this notification.
   */
  newId(): string {
    return new Types.ObjectId().toString();
  }

  /**
   * Get a logged notification by its id.
   *
   * @param {string} id - The notification's id.
   * @returns {Promise<Notification | null>} The notification, or null when there is none with that id.
   * @throws {RepositoryError} INVALID_ID when `id` is not a valid ObjectId.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   * @throws {DomainEntityError} When the stored record breaks a Notification invariant.
   */
  async getById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findById(id);
  }

  /**
   * Get every logged notification, newest first.
   *
   * @returns {Promise<Notification[]>} All logged notifications.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   * @throws {DomainEntityError} When a stored record breaks a Notification invariant.
   */
  async getAll(): Promise<Notification[]> {
    return this.notificationRepository.find({}, undefined, undefined, NEWEST_FIRST);
  }

  /**
   * Get one page of logged notifications, newest first.
   *
   * @param {number} offset - How many notifications to skip; an integer >= 0.
   * @param {number} limit - How many notifications to return at most; an integer > 0.
   * @returns {Promise<Notification[]>} The notifications on the page.
   * @throws {RangeError} When `offset` or `limit` is out of range; the database is not queried.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure.
   * @throws {DomainEntityError} When a stored record breaks a Notification invariant.
   */
  async get(offset: number, limit: number): Promise<Notification[]> {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new RangeError(`offset must be an integer >= 0, got ${offset}`);
    }
    // Checked here because the repository treats a limit of 0 as "no limit".
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError(`limit must be an integer > 0, got ${limit}`);
    }
    return this.notificationRepository.find({}, limit, offset, NEWEST_FIRST);
  }

  /**
   * Log a new notification.
   *
   * @param {NewNotification} notification - The notification to log.
   * @returns {Promise<Notification>} The logged notification, with its id.
   * @throws {RepositoryError} INVALID_ID for a malformed id; DUPLICATE_KEY when the id is already taken.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  async create(notification: NewNotification): Promise<Notification> {
    return this.notificationRepository.create(notification);
  }

  /**
   * Save a logged notification's current state, e.g. after `markSent()` or `markFailed()`. The save succeeds only
   * while the stored record is still at the version `notification` was read at.
   *
   * @param {Notification} notification - The notification to save, as read and then changed.
   * @returns {Promise<Notification | null>} The saved notification with its new version, or null when there is none with its id.
   * @throws {RepositoryError} VERSION_CONFLICT when the record was updated after `notification` was read; INVALID_ID for a malformed id.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached.
   * @throws {PersistanceError} For any other database failure (e.g. schema validation).
   */
  async update(notification: Notification): Promise<Notification | null> {
    return this.notificationRepository.update(notification.id, notification);
  }
}

export default NotificationLoggerService;
