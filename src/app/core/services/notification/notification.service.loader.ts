/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { INotificationConfig } from '../../config/service/notification.config';
import { registerService } from '../service.container';

export const notificationServiceLoader = (
  name: string,
  container: AwilixContainer,
  options: INotificationConfig,
): void => {
  try {
    // Assuming NotificationService is defined and imported correctly
    const notificationService = 'new NotificationService()';
    registerService(name, container, options, notificationService);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load NotificationService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
