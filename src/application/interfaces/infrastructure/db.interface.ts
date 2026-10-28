/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface IDatabase extends IBaseInfrastructureService {
  serviceName(): 'database';
  singleton(): true;
  deferred(): false;
  connection(uri: string, options?: unknown): Promise<unknown>;
  withTransaction(callback: () => Promise<unknown>): Promise<unknown>;
}
