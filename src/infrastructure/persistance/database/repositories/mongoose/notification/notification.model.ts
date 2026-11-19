/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Schema, model } from 'mongoose';

import type {
  INotificationChannel,
  INotificationStatus,
} from '@/application/interfaces/infrastructure/notification/notification.interface';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from '@/domain/app/notification/models/notification';

import type { Types } from 'mongoose';

export interface INewNotificationSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
  triggered_by: string;
  triggered_on: Date;
  topic: string;
  channel: INotificationChannel;
  service_provider: string;
  data: Record<string, unknown>;
  status: INotificationStatus;
}

export const NotificationSchema = new Schema<INewNotificationSchema>(
  {
    triggered_by: { type: String, required: true },
    triggered_on: { type: Date, required: true },
    topic: { type: String, required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    service_provider: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: NOTIFICATION_STATUSES, required: true },
  },
  // minimize: false stores an empty data object instead of dropping the field, so every record has one.
  { timestamps: true, minimize: false },
);

export const NotificationModel = model<INewNotificationSchema>('notification_log', NotificationSchema);
