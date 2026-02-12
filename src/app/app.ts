/* eslint-disable no-console */

/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import http from 'http';
import path from 'path';

import chalk from 'chalk';
import debug from 'debug';
import dotenv from 'dotenv';
import express from 'express';
import { asValue } from 'awilix';
import { scopePerRequest } from 'awilix-express';

import { InfrastructureManager } from '@/infrastructure/infrastructure.manager';

import { StartupBanner } from './core/utils/startup-banner';
import { configLoader } from './core/config/config';
import { coreMiddleware } from './core/middleware/core.middleware';
import { InfiniteNodeError } from './core/errors/InfiniteNodeError';
import { autoRegisterApplicationComponents, container } from './core/service.container';

import type { StartupBannerConfig } from './core/utils/startup-banner';
import type { Application, Router } from 'express';
import type { AwilixContainer } from 'awilix';
import type { Logger } from 'winston';
import type net from 'net';
import type { INodeApplicationConfig } from './core/config/config';

const debugLog = debug('server:server');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({
  path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV}`),
});

const config: INodeApplicationConfig = configLoader();

/**
 * InfiniteNodeApplication class
 *
 * This class initializes the main application
 */
class InfiniteNodeApplication {
  /**
   * @type {http.Server} httpServer - The HTTP server instance
   */
  private httpServer: http.Server;

  /**
   * @type {Application} express_server - The Express application instance
   */
  private express_server: Application;

  /**
   * @type {AwilixContainer} container - The dependency injection container
   */
  private container: AwilixContainer;

  /**
   * @type {InfrastructureManager} infrastructureManager - Manages infrastructure services
   */
  private infrastructureManager: InfrastructureManager;

  /**
   * @type {StartupBanner} startupBanner - Utility for displaying startup messages
   */
  private startupBanner: StartupBanner | undefined;

  /**
   * Constructor for InfiniteNodeApplication
   *
   * Initializes the express server, HTTP server, and core services.
   * Also sets up the application routes and starts listening on the configured port.
   *
   * @param {Router} routes - The main application router containing all route definitions
   * @throws {InfiniteNodeError} If there is an error during initialization
   */
  constructor(routes: Router) {
    try {
      this.container = container;
      this.express_server = this.initExpressServer(config);
      this.httpServer = this.initHttpServer();
      this.container.register({
        httpServer: asValue(this.httpServer),
        expressServer: asValue(this.express_server),
      });

      this.startupBanner = new StartupBanner(this.createBannerConfig());
      this.startupBanner.printBanner();

      this.infrastructureManager = new InfrastructureManager();
      this.infrastructureManager
        .init(this.container)
        .then(async () => {
          // Auto-register services, repositories, and controllers
          autoRegisterApplicationComponents();

          await this.initCoreMiddleware();
          this.express_server.use(scopePerRequest(this.container));
          this.express_server.use(config.app.apiUrlPrefix, routes);

          this.startupBanner?.printStartupInfo({
            appName: config.app.name,
            serverUrl: config.app.baseUrl,
            bindAddress: this.getServerBindString(),
          });
        })
        .catch((error) => {
          const logger = this.container.resolve<Logger>('logger', { allowUnregistered: true });
          if (logger && typeof logger.error === 'function') {
            logger.error('Error during application initialization', { error });
          }
          this.startupBanner?.printInitializationError(error);
          process.exit(1);
        });
    } catch (error) {
      if (this.startupBanner) {
        this.startupBanner.printFatalError(error as Error);
      } else {
        console.error(chalk.red('Fatal error during application startup:'), error);
      }
      process.exit(1);
    }
  }

  /**
   * Initialize the express server
   *
   * @param {object} config - The configuration object
   * @returns {Application} - The initialized express application
   */
  initExpressServer(config: INodeApplicationConfig): Application {
    const express_server = express();
    express_server.set('port', config.app.port);
    return express_server;
  }

  /**
   * Get the service name for this email implementation
   *
   * @returns {http.Server} The HTTP server instance
   */
  private initHttpServer(): http.Server {
    const httpServer = http.createServer(this.express_server);
    return httpServer;
  }

  /**
   * Get the formatted server bind address string
   *
   * @returns {string} Formatted bind address (e.g., "pipe /path" or "port 3000")
   */
  private getServerBindString(): string {
    const addr = this.httpServer.address();
    return typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  }

  /**
   * Create the startup banner configuration
   *
   * @returns {StartupBannerConfig} The banner configuration object
   */
  private createBannerConfig(): StartupBannerConfig {
    return {
      appName: 'Infinite Node Application',
      version: '1.0.0',
      year: '2025',
      author: 'Maleesha Gimshan',
      github: 'https://github.com/maleeshagimshan98',
      repository: 'https://github.com/maleeshagimshan98/infinite-node-application',
      buyMeCoffee: 'https://www.buymeacoffee.com/maleeshagimshan',
      license: 'MIT License',
      licenseUrl: 'https://opensource.org/licenses/MIT',
    };
  }

  /**
   * Initialize the core middleware
   *
   * @returns {Promise<void>}
   * @throws {InfiniteNodeError} If the middleware is not a function
   */
  async initCoreMiddleware(): Promise<void> {
    const coreMiddlewareStack = await coreMiddleware(this.container);
    this.startupBanner?.printMiddlewareInitStart();

    for (const middleware in coreMiddlewareStack) {
      if (typeof coreMiddlewareStack[middleware] === 'function') {
        this.express_server.use(coreMiddlewareStack[middleware]());
        this.startupBanner?.printMiddlewareSuccess(middleware);
      } else {
        this.startupBanner?.printMiddlewareError(middleware);
        throw new InfiniteNodeError(`Core Middleware ${middleware} must be a function`);
      }
    }
  }

  /**
   * Event listener for HTTP server "error" event.
   *
   * @param {NodeJS.ErrnoException} error
   * @param {string | number} port
   * @return {void}
   * @throws {NodeJS.ErrnoException} Throws the error if it's not related to listen syscall
   */
  private onListenError(error: NodeJS.ErrnoException, port: string | number): void {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    // Log the error using winston logger resolved from the container
    try {
      const logger = this.container.resolve<Logger>('logger', { allowUnregistered: true });
      if (logger && typeof logger.error === 'function') {
        logger.error(`Server error on ${bind}: ${error.message}`, { error });
      }
    } catch (e: unknown) {
      console.error(`Logger not available to log error: ${(e as Error).message}`, { e });
      process.exit(1);
    }

    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  /**
   * Event listener for HTTP server "clientError" event.
   *
   * This handler is invoked by Node's HTTP server when a low–level client-side
   * error occurs before Express routing logic runs. These errors typically stem
   * from malformed HTTP requests (e.g. invalid headers, premature socket close,
   * parser failures like `HPE_INVALID_METHOD`, `HPE_INVALID_CONSTANT`), protocol
   * violations, or abrupt client disconnects producing conditions such as
   * `ECONNRESET`.
   *
   * Why it exists:
   *  - Such failures do not pass through Express middleware; without this handler
   *    they would either be silent or produce an unstructured stack trace.
   *  - We log them for visibility (via the DI-resolved Winston logger when available)
   *    and proactively terminate the socket with a minimal 400 Bad Request response
   *    to avoid lingering half-open connections and resource leakage.
   *
   * @param {Error} error  The low-level error emitted by the HTTP parser / socket layer.
   * @param {net.Socket} socket  The raw network socket associated with the offending client.
   * @return {void}
   */
  private onClientError(error: Error, socket: net.Socket): void {
    try {
      const logger = this.container.resolve<Logger>('logger', { allowUnregistered: true });
      if (logger && typeof logger.error === 'function') {
        logger.error(`Client error: ${error.message}`, { error });
      }
    } catch (e: unknown) {
      console.error(`Logger not available to log error: ${(e as Error).message}`, { e });
    }
    console.error('Client error:', error);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }

  /**
   * Event listener for HTTP server "listening" event.
   */
  private onListening(server: http.Server): void {
    const bind = this.getServerBindString();
    debugLog(`Listening on ${bind}`);
  }

  /**
   * Listen to the server
   *
   * @returns {void}
   * @throws {InfiniteNodeError} If the server instance is not found
   */
  listen(): void {
    this.httpServer.listen(config.app.port);
    this.httpServer.on('error', (error: NodeJS.ErrnoException) => this.onListenError(error, config.app.port));
    this.httpServer.on('clientError', (error: Error, socket: net.Socket) => this.onClientError(error, socket));
    this.httpServer.on('listening', () => this.onListening(this.httpServer as http.Server));
    // this.express_server.listen(); TODO - CHECK
  }
}

export default InfiniteNodeApplication;
