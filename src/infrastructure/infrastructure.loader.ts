/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/base.interface';
import type {
  ICache,
  IDatabaseMapper,
  IEmail,
  ILogger,
  INotification,
  IQueue,
  ISocket,
  IStorage,
} from '@/application/interfaces';

import { CacheServiceFactory } from './cache';
import { EmailServiceFactory } from './email';
import { LoggerServiceFactory } from './logger';
import { NotificationServiceFactory } from './notification';
import { DatabaseMapperServiceFactory } from './persistance/database/service';
import { QueueServiceFactory } from './queue';
import { SocketServiceFactory } from './socket/socket-service.factory';
import { StorageServiceFactory } from './storage';

export interface IInfrastructureLoader {
  [key: string]: () => Promise<IBaseInfrastructureService>;
}

export const infrastructureLoader: IInfrastructureLoader = {
  cache: async (): Promise<ICache> => {
    return await CacheServiceFactory.create();
  },
  email: async (): Promise<IEmail> => {
    return await EmailServiceFactory.create();
  },
  logger: async (): Promise<ILogger> => {
    return await LoggerServiceFactory.create();
  },
  notification: async (): Promise<INotification> => {
    return await NotificationServiceFactory.create();
  },
  persistance: async (): Promise<IDatabaseMapper> => {
    return await DatabaseMapperServiceFactory.create();
  },
  queue: async (): Promise<IQueue> => {
    return await QueueServiceFactory.create();
  },
  socket: async (): Promise<ISocket> => {
    return await SocketServiceFactory.create();
  },
  storage: async (): Promise<IStorage> => {
    return await StorageServiceFactory.create();
  },
};
