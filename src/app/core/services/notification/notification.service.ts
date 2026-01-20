import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../core.service';
import type { INotificationConfig } from '../../config/service/notification.config';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';

export class NotificationService implements ICoreService<undefined, INotificationConfig> {
  private client: undefined;

  constructor() {}

  async init(_container: AwilixContainer, _config: INotificationConfig): Promise<void> {
    try {
      // Placeholder in-memory notification bus; extend with real providers later
    } catch (err: unknown) {
      throw new InfiniteNodeError(
        `Failed to initialize NotificationService: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  service(): undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    //... TODO
  }
}
