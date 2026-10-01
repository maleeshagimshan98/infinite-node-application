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

  /**
   * Create the Socket.IO server on the configured HTTP server.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} If the Socket.IO server cannot be created or fails basic validation
   */
  async init(): Promise<void> {
    const options: Partial<ServerOptions> = {};
    if (this._config.params?.path) options.path = this._config.params.path;
    if (this._config.params?.cors) options.cors = this._config.params.cors;

    let io: Server;
    try {
      io = new Server(this._httpServer, options);
    } catch (err: unknown) {
      throw new DriverError(
        `Failed to initialize SocketsDriver: ${err instanceof Error ? err.message : 'Unknown error'}`,
        err instanceof Error ? err : undefined,
      );
    }

    if (typeof io.on !== 'function' || typeof io.emit !== 'function') {
      throw new DriverError('Failed to initialize SocketsDriver: Socket.io server failed basic validation.');
    }

    this._client = io;
  }

  config(): ISocketConfig {
    return this._config;
  }

  client(): Server | undefined {
    return this._client;
  }

  /**
   * Close the Socket.IO server.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} If the server fails to close
   */
  async shutdown(): Promise<void> {
    if (!this._client) return;
    try {
      await this._client.close();
    } catch (e: unknown) {
      throw new DriverError(
        `Failed to shutdown SocketsDriver: ${e instanceof Error ? e.message : 'Unknown error'}`,
        e instanceof Error ? e : undefined,
      );
    } finally {
      this._client = undefined;
    }
  }
}
