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
import { config } from './core/config/config';
import { coreMiddleware } from './core/core.middleware';
// import type { IService } from '../services/IService';
import { InfiniteNodeError } from './errors/InfiniteNodeError';
import type { ServiceLoaders } from './core/services/services.loader';
import { serviceLoaders } from './core/services/services.loader';
import { container } from './core/services/service.container';
import { asValue, type AwilixContainer } from 'awilix';
import type { ServiceConfig } from './core/config/service/services.config';
import { scopePerRequest } from 'awilix-express';
const debugLog = debug('server:server');

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
   * @type {Array<keyof ServiceLoaders>} _defferedServices - List of deffered services to be initialized later
   */
  private _defferedServices: Array<keyof ServiceLoaders> = [];
  private _app = {
    services: {},
    routes: {},
    middleware: {},
  };

  /**
   *
   */
  constructor(routes: Router) {
    dotenv.config();
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
    console.log(chalk.cyan.bold('\n========== Infinite Node Application ==========\n'));
    console.log(chalk.green(`initializing the core middleware \n`));
    this.initCoreMiddleware();
    console.log(chalk.green(`initializing the core services \n`));
    this.initializeCoreServices();
    this.express_server.use(scopePerRequest(this.container));
    this.express_server.use(config.app.apiUrlPrefix, routes);
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
   * @returns {void}
   * @throws {InfiniteNodeError} If the middleware is not a function
   */
  initCoreMiddleware(): void {
    const coreMiddlewareStack = coreMiddleware();
    for (const middleware in coreMiddlewareStack) {
      if (typeof coreMiddlewareStack[middleware] === 'function') {
        this.express_server.use(coreMiddlewareStack[middleware]());
      } else {
        throw new InfiniteNodeError(`Core Middleware ${middleware} must be a function`);
      }
    }
  }

  /**
   * Register a service in the DI container
   *
   * @param {keyof IServiceLoaders} serviceName - The name of the service
   * @param {function} serviceLoader - The service loader function
   * @param {object} options - The configuration options for the service
   * @returns {void}
   * @throws {InfiniteNodeError} If the service loader is not found or not a function
   */
  private async registerService<K extends keyof ServiceLoaders>(
    serviceName: K,
    serviceLoader: ServiceLoaders[K],
    options: ServiceConfig[K],
  ): Promise<void> {
    if (!serviceLoader) {
      throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
    }
    if (typeof serviceLoader !== 'function') {
      throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
    }
    //... registering the service in DI container
    await serviceLoader(this.container, options);
    console.log(chalk.green(`-- Service ${serviceName} registered successfully`));
  }

  /**
   * Initialize deffered services
   *
   * @returns {void}
   * @throws {InfiniteNodeError} If the service loader is not found or not a function
   */
  initDefferedServices(): void {
    this._defferedServices.forEach(async (serviceName) => {
      const options = config.services[serviceName];
      const serviceLoader = serviceLoaders[serviceName];
      if (!serviceLoader) {
        throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
      }
      if (typeof serviceLoader !== 'function') {
        throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
      }
      //... registering the service in DI container
      await this.registerService(serviceName, serviceLoader, options);
    });
    this._defferedServices = []; // Clear deffered services after initialization
  }

  /**
   *
   */
  private async initializeCoreServices(): Promise<void> {
    const serviceConfig: ServiceConfig = config.services;
    for (const serviceName of Object.keys(serviceConfig) as Array<keyof ServiceLoaders>) {
      const options = serviceConfig[serviceName];
      const serviceLoader: ServiceLoaders[typeof serviceName] = serviceLoaders[serviceName];
      if (!serviceLoader) {
        throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
      }
      if (typeof serviceLoader !== 'function') {
        throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
      }
      if (options.deffered) {
        this._defferedServices.push(serviceName);
        continue; // Skip deffered services for now
      }
      //... registering the service in DI container
      await this.registerService(serviceName, serviceLoader, options);
      this.initDefferedServices();
    }
  }

  // /**
  //  *
  //  * @param {string} serviceName
  //  * @param {mixed} service
  //  * @returns {void}
  //  * @throws {Error}
  //  */
  // _setService(serviceName: string, service: IService): void {
  //   if (!this._app.services.hasOwnProperty(serviceName)) {
  //     throw new Error(`Service is not defined`); //... TODO - change the error message
  //   }
  //   this._app.services[serviceName] = service;
  // }

  /**
   * Event listener for HTTP server "error" event.
   */
  private onError(error: NodeJS.ErrnoException, port: string | number): void {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

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
   * Event listener for HTTP server "listening" event.
   */
  private onListening(server: http.Server): void {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
    debugLog(`Listening on ${bind}`);
    console.log(chalk.green(`\n Server running on: ${chalk.underline(bind)}\n`));
    console.log(chalk.cyan.bold('=================================\n'));
  }

  /**
   * Listen to the server
   *
   * @returns {void}
   * @throws {InfiniteNodeError} If the server instance is not found
   */
  listen(): void {
    this.httpServer.listen(config.app.port);
    this.httpServer.on('error', (error: NodeJS.ErrnoException) => this.onError(error, config.app.port));
    this.httpServer.on('listening', () => this.onListening(this.httpServer as http.Server));
    // this.express_server.listen(); TODO - CHECK
  }
}

export default InfiniteNodeApplication;
