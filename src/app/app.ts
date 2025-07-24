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
import { serviceLoaders } from './core/services/services.loader';
import { container } from './core/services/service.container';
import type { AwilixContainer } from 'awilix';
import type { ServiceConfig } from './core/config/service/services.config';
const debugLog = debug('server:server');

/**
 * InfiniteNodeApplication class
 *
 * This class initializes the main application
 */
class InfiniteNodeApplication {
  private httpServer: http.Server | null = null;
  /**
   * @type {Application} express_server - The Express application instance
   */
  private express_server: Application;
  private container: AwilixContainer;
  private _defferedServices: Record<string, unknown> = {};
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
    this.initCoreMiddleware();
    //... Routes
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
   * Initialize deffered services
   *
   * @returns {void}
   * @throws {InfiniteNodeError} If the service loader is not found or not a function
   */
  initDefferedServices(): void {
    let serviceName: keyof ServiceConfig;

    //... Register deffered services
    for (const serviceName in this._defferedServices) {
      const options = this._defferedServices[serviceName];
      const serviceLoader = serviceLoaders[serviceName];
      if (!serviceLoader) {
        throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
      }
      if (typeof serviceLoader !== 'function') {
        throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
      }
      serviceLoader(this.container, options);
    }
  }

  /**
   *
   */
  private initializeCoreServices(): void {
    const serviceConfig: ServiceConfig = config.services;
    let serviceName: keyof ServiceConfig;
    for (serviceName in serviceConfig) {
      const options = serviceConfig[serviceName];
      const serviceLoader = serviceLoaders[serviceName];
      if (!serviceLoader) {
        throw new InfiniteNodeError(`Service loader for ${serviceName} not found`);
      }
      if (typeof serviceLoader !== 'function') {
        throw new InfiniteNodeError(`Service ${serviceName} must be a function`);
      }
      if (options.deffered) {
        this._defferedServices[serviceName] = options;
        continue; // Skip deffered services for now
      }
      //... registering the service in DI container
      serviceLoader(this.container, options);
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
    console.log(chalk.cyan.bold('\n========== Express.js ==========\n'));
    console.log(chalk.green(`Server running on: ${chalk.underline(bind)}\n`));
    console.log(chalk.cyan.bold('=================================\n'));
  }

  /**
   * Listen to the server
   *
   * @returns {void}
   * @throws {InfiniteNodeError} If the server instance is not found
   */
  listen(): void {
    if (!this.express_server) {
      throw new InfiniteNodeError(`Server instance is not found`);
    }

    this.httpServer = http.createServer(this.express_server);
    this.httpServer.listen(config.app.port);
    this.httpServer.on('error', (error: NodeJS.ErrnoException) => this.onError(error, config.app.port));
    this.httpServer.on('listening', () => this.onListening(this.httpServer as http.Server));
    this.express_server.listen();
  }
}

export default InfiniteNodeApplication;
