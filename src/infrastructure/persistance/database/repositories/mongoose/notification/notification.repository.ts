/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Notification, NewNotification } from '@/domain/app/notification/models/notification';
import type { INotificationRepository } from '@/application/interfaces/repositories/notification/notification.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { NotificationMapper } from './notification.mapper';
import { NotificationModel } from './notification.model';

import type { INewNotificationSchema } from './notification.model';

export class NotificationRepository
  extends BaseRepository<INewNotificationSchema, Notification, NewNotification>
  implements INotificationRepository
{
  constructor() {
    super(NotificationModel, new NotificationMapper());
  }
}

export default NotificationRepository;
