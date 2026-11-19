/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Notification, NewNotification } from '@/domain/app/notification/models/notification';

import type { IBaseRepository } from '../base.repository.interface';

// A type alias, not an empty interface (`@typescript-eslint/no-empty-object-type`); turn it into an interface
// that extends IBaseRepository once it gains notification-specific queries.
export type INotificationRepository = IBaseRepository<Notification, NewNotification>;

export default INotificationRepository;
