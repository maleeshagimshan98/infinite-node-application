import type { AwilixContainer } from 'awilix';
import { registerService } from '../../service.container';
import { type IQueueConfig } from '../../config/drivers/queue.config';
import { QueueDriver } from './queue.driver';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import type { Queue } from 'bullmq';

export const queueDriverLoader = async (container: AwilixContainer, config: IQueueConfig): Promise<QueueDriver> => {
  try {
    const queueDriver = new QueueDriver();
    await queueDriver.init(container, config);
    const client = queueDriver.driver() as Queue | undefined;
    if (!client || typeof client.add !== 'function') {
      throw new InfiniteNodeError('Queue client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return queueDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load QueueDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
