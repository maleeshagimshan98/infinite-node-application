import type { AwilixContainer } from 'awilix';
import { registerService } from '../service.container';
import type { IQueueConfig } from '../../config/service/queue.config';
import { Queue } from 'bullmq';

const createQueueClient = async (config: IQueueConfig): Promise<Queue> => {
  const defaultQueue = new Queue(config.queueName, {
    connection: {
      host: config.config.host,
      port: config.config.port,
      username: config.config.username,
      password: config.config.password,
    },
  });
  return defaultQueue;
};

export const queueServiceLoader = async (
  name: string,
  container: AwilixContainer,
  config: IQueueConfig,
): Promise<void> => {
  registerService(name, container, config, await createQueueClient(config));
};
