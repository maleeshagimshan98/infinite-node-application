/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewNotification } from '@/domain/app/notification/models/notification';
import { Notification } from '@/domain/app/notification/models/notification';

import { BaseMapper } from '../base/base.mapper';

import type { INewNotificationSchema } from './notification.model';

export class NotificationMapper extends BaseMapper<INewNotificationSchema, Notification, NewNotification> {
  /**
   * Convert a persisted notification log document into a Notification domain model.
   *
   * @param {INewNotificationSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {Notification} The mapped domain model.
   * @throws {DomainEntityError} When the stored document breaks a Notification invariant (e.g. an empty topic).
   */
  toDomain(data: INewNotificationSchema & { _id: Types.ObjectId }): Notification {
    return new Notification({
      id: data._id.toString(),
      version: this.toVersion(data.__v, data._id),
      triggered_by: data.triggered_by,
      triggered_on: data.triggered_on,
      topic: data.topic,
      channel: data.channel,
      service_provider: data.service_provider,
      data: data.data,
      status: data.status,
    });
  }

  /**
   * Convert a new/updated Notification domain model into its persistence schema shape.
   *
   * @param {NewNotification} data - The domain model data to persist.
   * @returns {INewNotificationSchema} The persistence-ready schema object.
   */
  toPersistence(data: NewNotification): INewNotificationSchema {
    // toFilter() (inherited from BaseMapper) also calls this with a partial filter object, so any field may be
    // absent: copy each one as it is, and add no defaults that would become filter clauses.
    const base = {
      triggered_by: data.triggered_by,
      triggered_on: data.triggered_on,
      topic: data.topic,
      channel: data.channel,
      service_provider: data.service_provider,
      data: data.data,
      status: data.status,
    };
    return !data.id ? base : { ...base, _id: new Types.ObjectId(data.id) };
  }
}
