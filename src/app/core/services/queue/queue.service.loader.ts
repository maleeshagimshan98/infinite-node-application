import type { AwilixContainer } from 'awilix';
import { registerService } from '../service.container';
import { type IQueueConfig } from '../../config/service/queue.config';
import { QueueService } from './queue.service';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { Queue } from 'bullmq';

export const queueServiceLoader = async (container: AwilixContainer, config: IQueueConfig): Promise<QueueService> => {
  try {
    const queueService = new QueueService();
    await queueService.init(container, config);
    const client = queueService.service() as Queue | undefined;
    if (!client || typeof client.add !== 'function') {
      throw new InfiniteNodeError('Queue client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return queueService;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load QueueService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
