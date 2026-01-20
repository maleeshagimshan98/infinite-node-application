import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../core.service';
import type { IMongooseConfig } from '../../config/service/mongoose.config';
import mongoose, { type Mongoose } from 'mongoose';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';

export class MongooseService implements ICoreService<Mongoose, IMongooseConfig> {
  private client: Mongoose | undefined;

  constructor() {}

  async init(container: AwilixContainer, config: IMongooseConfig): Promise<void> {
    try {
      const conn = await mongoose.connect(config.uri, config.options);
      this.client = conn;
      if (this.client.connection.readyState !== 1) {
        throw new InfiniteNodeError(`Mongoose not connected. State: ${this.client.connection.readyState}`);
      }
      this.client.connection.on('error', (err) => {
        throw new InfiniteNodeError(`Mongoose connection error: ${err instanceof Error ? err.message : String(err)}`);
      });
    } catch (err: unknown) {
      throw new InfiniteNodeError(
        `Failed to initialize MongooseService: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  service(): Mongoose | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.disconnect();
    } catch (_e: unknown) {
      // todo
    }
  }
}
