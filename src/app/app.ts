/* eslint-disable no-console */

/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import express from 'express';
import type { Application, Router } from 'express';
import dotenv from 'dotenv';
import http from 'http';
import debug from 'debug';
import chalk from 'chalk';
import type { INodeApplicationConfig } from './core/config/config';
import { configLoader } from './core/config/config';
import { coreMiddleware } from './core/middleware/core.middleware';
// import type { IService } from '../services/IService';
import { InfiniteNodeError } from './core/errors/InfiniteNodeError';
import type { ServiceLoaders, ServiceReturnTypes } from './core/services/services.loader';
import { serviceLoaders } from './core/services/services.loader';
import { container } from './core/services/service.container';
import { asValue, type AwilixContainer } from 'awilix';
import type { ServiceConfig } from './core/config/service/services.config';
import { scopePerRequest } from 'awilix-express';
import type { Logger } from 'winston';
import path from 'path';
import type net from 'net';

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
   * @type {Array<keyof ServiceLoaders>} _deferredServices - List of deferred services to be initialized later
   */
  private _deferredServices: Array<keyof ServiceLoaders> = [];

  /**
   * @type {Record<keyof ServiceConfig, ServiceReturnTypes[keyof ServiceConfig]> | Record<string, unknown>} services - Registered services
   */
  private services: Record<keyof ServiceConfig, ServiceReturnTypes[keyof ServiceConfig]> | Record<string, unknown> = {};

  private consoleNotice(): void {
    console.log(
      chalk.cyan.bold('\n========== Infinite Node Application - v1.0.0 ==========\n') +
        '\n' +
        chalk.green('© 2025 ') +
        chalk.cyan('Maleesha Gimshan') +
        '\n \n' +
        chalk.blue('GitHub: ') +
        chalk.underline('https://github.com/maleeshagimshan98') +
        '\n' +
        chalk.blue('Repository: ') +
        chalk.underline('https://github.com/maleeshagimshan98/infinite-node-application') +
        '\n' +
        chalk.yellow('Buy Me a Coffee: ') +
        chalk.underline('https://www.buymeacoffee.com/maleeshagimshan') +
        '\n' +
        chalk.magenta('Licensed under the MIT License: ') +
        chalk.underline('https://opensource.org/licenses/MIT') +
        '\n',
    );
  }

  /**
   *
   */
  constructor(routes: Router) {
    try {
      this.container = container;
      this.express_server = this.initExpressServer(config);
      if (!this.express_server) {
        throw new InfiniteNodeError(`Server instance is not found`);
      }
      this.httpServer = http.createServer(this.express_server);
      this.container.register({
        httpServer: asValue(this.httpServer),
        expressServer: asValue(this.express_server),
      });
      this.consoleNotice();
      this.initializeCoreServices()
        .then(async () => {
          await this.initCoreMiddleware();
          this.express_server.use(scopePerRequest(this.container));
          this.express_server.use(config.app.apiUrlPrefix, routes);
          const addr = this.httpServer.address();
          const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
          console.log(chalk.magenta(`\nApplication name - ${config.app.name}`));
          console.log(chalk.magenta(`Server Url - ${config.app.baseUrl}`));
          console.log(chalk.magenta(`Server running on: ${chalk.underline(bind)}\n`));
          console.log(chalk.cyan.bold('=================================\n'));
        })
        .catch((error) => {
          const logger = this.container.resolve<Logger>('logger', { allowUnregistered: true });
          if (logger && typeof logger.error === 'function') {
            logger.error('Error during application initialization', { error });
          }
          console.error(chalk.red('Error during application initialization:'), error);
          process.exit(1);
        });
    } catch (error) {
      console.error(chalk.red('Fatal error during application startup:'), error);
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
    this.express_server = express();
    this.express_server.set('port', config.app.port);
    return this.express_server;
  }

  /**
   * Initialize the core middleware
   *
   * @returns {Promise<void>}
   * @throws {InfiniteNodeError} If the middleware is not a function
   */
  async initCoreMiddleware(): Promise<void> {
    const coreMiddlewareStack = await coreMiddleware(this.container);
    console.log(chalk.green(`\n \n initializing the core middleware \n`));
    for (const middleware in coreMiddlewareStack) {
      if (typeof coreMiddlewareStack[middleware] === 'function') {
        this.express_server.use(coreMiddlewareStack[middleware]());
        console.log(chalk.green(`-- ${middleware} initialized successfully`));
      } else {
        console.log(chalk.red(`Error initializing core middleware ${middleware}`));
        throw new InfiniteNodeError(`Core Middleware ${middleware} must be a function`);
      }
    }
  }

  /**
   * Register a service in the DI container
   *
   * @param {keyof ServiceLoaders} serviceName - The name of the service
   * @param {function} serviceLoader - The service loader function
   * @param {object} options - The configuration options for the service
   * @returns {void}
   * @throws {InfiniteNodeError} If the service loader is not found or not a function
   */
  private async registerService<K extends keyof ServiceLoaders>(
    serviceName: K,
    serviceLoader: ServiceLoaders[K],
    _options: ServiceConfig[K],
  ): Promise<void> {
    if (!serviceLoader) {
      throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
    }
    if (typeof serviceLoader !== 'function') {
      throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
    }
    //... registering the service in DI container
    this.services[serviceName] = await serviceLoader(this.container, _options);
    console.log(chalk.green(`-- Service ${serviceName} registered successfully`));
  }

  /**
   * Initialize deferred services
   *
   * @returns {void}
   * @throws {InfiniteNodeError} If the service loader is not found or not a function
   */
  async initDeferredServices(): Promise<void> {
    for (const serviceName of this._deferredServices) {
      const options = config.services[serviceName];
      const serviceLoader = serviceLoaders[serviceName];
      if (!serviceLoader) {
        throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
      }
      if (typeof serviceLoader !== 'function') {
        throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
      }
      await this.registerService(serviceName, serviceLoader, options);
    }
    this._deferredServices = []; // Clear deffered services after initialization
  }

  /**
   * Initialize core services
   *
   * This method iterates through all service loaders defined in the service loaders.
   * If the service is marked as deferred (options.deferred), it adds the service to the deferred services list
   * for later initialization and skips immediate registration.
   * Otherwise, it registers the service immediately in the dependency injection container.
   * After processing all services, it initializes any deferred services.
   *
   * @returns {Promise<void>} Resolves when all core and deferred services are initialized.
   * @throws {InfiniteNodeError} If a service loader is missing or not a function.
   */
  private async initializeCoreServices(): Promise<void> {
    const serviceConfig: ServiceConfig = config.services;
    console.log(chalk.green(`initializing the core services \n`));
    for (const serviceName of Object.keys(serviceConfig) as Array<keyof ServiceLoaders>) {
      const options = serviceConfig[serviceName];
      const serviceLoader: ServiceLoaders[typeof serviceName] = serviceLoaders[serviceName];
      if (!serviceLoader) {
        throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
      }
      if (typeof serviceLoader !== 'function') {
        throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
      }
      if (options.deferred) {
        this._deferredServices.push(serviceName);
        continue; // Skip deffered services for now
      }
      //... registering the service in DI container
      await this.registerService<typeof serviceName>(serviceName, serviceLoader, options);
    }
    await this.initDeferredServices();
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
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
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
