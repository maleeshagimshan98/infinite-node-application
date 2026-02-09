import type { AwilixContainer } from 'awilix';
import type { ICoreDriver } from '../core.driver';
import type { INotificationConfig } from '../../config/drivers/notification.config';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';

export class NotificationDriver implements ICoreDriver<undefined, INotificationConfig> {
  private client: undefined;

  constructor() {}

  async init(_container: AwilixContainer, _config: INotificationConfig): Promise<void> {
    try {
      // Placeholder in-memory notification bus; extend with real providers later
    } catch (err: unknown) {
      throw new InfiniteNodeError(
        `Failed to initialize NotificationDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  driver(): undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    //... TODO
  }
}
