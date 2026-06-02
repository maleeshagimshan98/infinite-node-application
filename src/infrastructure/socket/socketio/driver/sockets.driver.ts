/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Server, type ServerOptions } from 'socket.io';

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import type { Server as HttpServer } from 'http';
import type { ISocketConfig } from './socket.config';

export class SocketsDriver implements ICoreDriver<Server, ISocketConfig> {
  /**
   * The configuration for the SocketsDriver
   *
   * @type {ISocketConfig}
   */
  private _config: ISocketConfig;

  /**
   * The HTTP server instance to attach Socket.io to
   *
   * @type {HttpServer}
   */
  private _httpServer: HttpServer;

  /**
   * The underlying Socket.io server instance
   *
   * @type {Server | undefined}
   */
  private _client: Server | undefined;

  constructor(config: ISocketConfig, httpServer: HttpServer) {
    this._config = config;
    this._httpServer = httpServer;
  }

  async init(): Promise<void> {
    try {
      const options: Partial<ServerOptions> = {};
      if (this._config.params?.path) options.path = this._config.params.path;
      if (this._config.params?.cors) options.cors = this._config.params.cors;

      const io = new Server(this._httpServer, options);

      if (typeof io.on !== 'function' || typeof io.emit !== 'function') {
        throw new DriverError('Socket.io server failed basic validation.');
      }

      this._client = io;
    } catch (err: unknown) {
      throw new DriverError(
        `Failed to initialize SocketsDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  config(): ISocketConfig {
    return this._config;
  }

  client(): Server | undefined {
    return this._client;
  }

  async shutdown(): Promise<void> {
    if (!this._client) return;
    try {
      await this._client.close();
    } catch (e: unknown) {
      //... TODO
    } finally {
      this._client = undefined;
    }
  }
}
