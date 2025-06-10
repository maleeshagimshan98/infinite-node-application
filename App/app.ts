/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import koa from "koa";
import { IService } from "../services/IService";

class InfiniteNodeApplication {
  private _server: koa;
  private _app = {
    services: {},
    routes: {},
    middleware: {},
  }
  private _config = {}
  private _serviceLoaders = {}
  private _defferedServices = {} //... {notification : ['socket', 'db]}

  /**
   *
   */
  constructor() {
    this._config = this._getConfigFile("../config/config.js")
    this._server = new koa()
  }

  /**
   * Get the config file from the given path
   *
   * @param {string} filePath
   * @returns {Object}
   * @throws {Error}
   */
  _getConfigFile(filePath: string): Promise<object> {
    try {
      return import(filePath)
    } catch (e) {
      throw new Error(`InfiniteNodeApplication - ${e.message}`)
    }
  }

  /**
   *
   * @param {Object} config
   * @return {}
   */
  _parseConfig(config) {
    const serviceItems = ["orm", "cache", "socket", "storage", "email", "notification", "logging"]
    for (const section in config) {
    }
  }

  _initializeDIContainer() {}

  /**
   *
   * @param {string} serviceName
   * @param {mixed} service
   * @returns {void}
   * @throws {Error}
   */
  _setService(serviceName: string, service: IService) {
    if (!this._app.services.hasOwnProperty(serviceName)) {
      throw new Error(`Service is not defined`) //... TODO - change the error message
    }
    this._app.services[serviceName] = service
  }

  /**
   *
   */
  _initializeServices() {
    const serviceLoaders = this._serviceLoaders
    for (const loader in serviceLoaders) {
      if (typeof serviceLoaders[loader] !== "function") {
        throw new Error(`ServiceLoader must be a function`) //... TODO - change the error message
      }
      //... deffered service
      if (this._config.hasOwnProperty(loader) && this._config[loader].deffered) {
        //... set deffered services
        //... continue
      }
      const service = serviceLoaders[loader]("di_container", this._config[loader]) //... TODO - pass paramters - DICOntainer, config
      if (typeof service === "function") {
        //... TODO - has dependant services before instantiation
      }
      this._setService(loader,service)
    }
  }

  listen() {
    if (!this._server) {
      throw new Error(`Server instance is not found`)
    }
    this._server.listen() //... TODO - add port from the config
  }
}

export default InfiniteNodeApplication
