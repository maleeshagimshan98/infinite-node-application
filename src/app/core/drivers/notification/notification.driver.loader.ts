/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import { type INotificationConfig } from '../../config/drivers/notification.config';
import { NotificationDriver } from './notification.driver';
import type { EventEmitter } from 'events';

export const notificationDriverLoader = async (
  container: AwilixContainer,
  config: INotificationConfig,
): Promise<NotificationDriver> => {
  try {
    const notificationDriver = new NotificationDriver();
    await notificationDriver.init(container, config);
    const client = notificationDriver.driver() as EventEmitter | undefined;
    if (!config.optional && (!client || typeof client.emit !== 'function')) {
      throw new InfiniteNodeError('Notification driver is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return notificationDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load NotificationDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
