/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../core.service';
import type { ISocketConfig } from '../../config/service/socket.config';
import { Server, type ServerOptions } from 'socket.io';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { Server as HttpServer } from 'http';

export class SocketsService implements ICoreService<Server, ISocketConfig> {
  private client: Server | undefined;

  constructor() {}

  async init(container: AwilixContainer, config: ISocketConfig): Promise<void> {
    try {
      const httpServer = container.resolve<HttpServer>('httpServer');
      if (!httpServer) {
        throw new InfiniteNodeError('httpServer is not available in container for SocketsService.');
      }

      const options: Partial<ServerOptions> = {};
      if (config.params?.path) options.path = config.params.path;
      if (config.params?.cors) options.cors = config.params.cors as any;

      const io = new Server(httpServer, options);

      if (typeof io.on !== 'function' || typeof io.emit !== 'function') {
        throw new InfiniteNodeError('Socket.io server failed basic validation.');
      }

      this.client = io;
    } catch (err: unknown) {
      throw new InfiniteNodeError(
        `Failed to initialize SocketsService: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  service(): Server | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.close();
    } catch (e: unknown) {
      //... TODO
    } finally {
      this.client = undefined;
    }
  }
}
