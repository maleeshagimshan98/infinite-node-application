/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { asFunction } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { INotificationConfig } from '../../config/service/notification.config';

export const notificationServiceLoader = (container: AwilixContainer, options: INotificationConfig): void => {
  try {
    // Assuming NotificationService is defined and imported correctly
    const notificationService = 'new NotificationService()';
    container.register({
      notificationService: asFunction(() => notificationService).singleton(),
    });
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load NotificationService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
