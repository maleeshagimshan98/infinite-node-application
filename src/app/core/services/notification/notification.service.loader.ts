/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import { type INotificationConfig } from '../../config/service/notification.config';
import { NotificationService } from './notification.service';
import type { EventEmitter } from 'events';

export const notificationServiceLoader = async (
  container: AwilixContainer,
  config: INotificationConfig,
): Promise<NotificationService> => {
  try {
    const notificationService = new NotificationService();
    await notificationService.init(container, config);
    const client = notificationService.service() as EventEmitter | undefined;
    if (!config.optional && (!client || typeof client.emit !== 'function')) {
      throw new InfiniteNodeError('Notification client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return notificationService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load NotificationService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
