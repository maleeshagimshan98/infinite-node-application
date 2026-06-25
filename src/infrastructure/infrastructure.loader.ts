/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/base-infrastructure-service.interface';

import { CacheServiceFactory } from './cache';
import { EmailServiceFactory } from './email';
import { LoggerServiceFactory } from './logger';
import { NotificationServiceFactory } from './notification';
import { DatabaseMapperServiceFactory } from './persistance/database/service';
import { QueueServiceFactory } from './queue';
import { SocketServiceFactory } from './socket/socket-service.factory';
import { StorageServiceFactory } from './storage';
import { HTTPClientServiceFactory } from './http';

import type { IServiceFactory } from './core/interfaces/service.factory.interface';

export type InfrastructureFactoryClass = new () => IServiceFactory<IBaseInfrastructureService>;

export const infrastructureLoader: InfrastructureFactoryClass[] = [
  CacheServiceFactory,
  EmailServiceFactory,
  LoggerServiceFactory,
  NotificationServiceFactory,
  DatabaseMapperServiceFactory,
  QueueServiceFactory,
  SocketServiceFactory,
  StorageServiceFactory,
  HTTPClientServiceFactory,
];
