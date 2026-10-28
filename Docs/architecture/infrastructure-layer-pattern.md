# Infrastructure Layer Pattern

## Overview

This document describes the exact architectural approach for organizing infrastructure-level services (database, cache, storage, email, etc.) in this application. The pattern separates **drivers** (low-level client connections managed via `ICoreDriver`) from **services** (application-facing implementations that implement `IBaseInfrastructureService`) while maintaining clean architecture principles.

Infrastructure services are initialized at boot time by `InfrastructureManager`, which iterates a registry of factory classes (`infrastructureLoader`). Each factory implements `IServiceFactory<T>` and is responsible for reading its own configuration from environment variables, creating its driver (if applicable), and returning either a ready service instance or — when the service needs other infrastructure services — a closure that builds it from them. The `InfrastructureManager` registers each result in the Awilix DI container under the factory's `name()`, then resolves them all.

## Core Principles

1. **All external system integrations belong in `src/infrastructure/`** — not in `src/app/core/`
2. **Service configuration is read from env vars inside each factory** — there are no per-service config files in `app/core/config/`; only `app.config.ts`, `server.config.ts`, and `config.ts` live there
3. **Application layer depends only on interfaces** — defined in `src/application/interfaces/infrastructure/`
4. **Each infrastructure service implements `IBaseInfrastructureService`** — declaring its `serviceName`, `singleton`, and `deferred` flags
5. **Each infrastructure service has a factory implementing `IServiceFactory<T>`** — factories are registered in `infrastructure.loader.ts`
6. **`InfrastructureManager` orchestrates all service initialization** — it iterates factory classes, calls `factory.create()`, registers every result in the Awilix container under `factory.name()`, and only then resolves them, so a service can depend on another infrastructure service wherever it sits in the loader
7. **Drivers implement `ICoreDriver<ClientType, ConfigType>`** — only used internally by services; never registered in the DI container directly
8. **Infrastructure errors are for infrastructure failures only** — a service wraps only its driver's own failures (the `try` covers the driver call alone; caller input is serialized/validated before it; caller callbacks are never wrapped), keeps the original error in `data.cause`, and never attaches objects carrying secrets. The error message is for the logs; clients get a generic 500/503 (`CLAUDE.md` §14–§15)

## Directory Structure

```
src/
  app/
    core/
      config/
        app.config.ts               ← App name, port, API prefix (from env vars)
        server.config.ts            ← SSL/TLS options
        config.ts                   ← Root config loader (composes all above)
      errors/
      middleware/
      shutdown/
      utils/
      service.container.ts          ← Awilix DI container + autoRegisterApplicationComponents()

  infrastructure/
    core/
      interfaces/
        service.factory.interface.ts  ← IServiceFactory<T> { name(); create(): Promise<T | ServiceClosure<T>> }
      driver/
        core.driver.ts                ← ICoreDriver<ClientType, ConfigType> interface
        core.driver.config.ts         ← IDriverConfig base interface
      errors/
        infrastructure.error.ts
        driver.error.ts

    cache/                            ← Cache service (e.g. Redis)
    email/                            ← Email service (e.g. SendGrid, SMTP)
    http/                             ← HTTP client service
    logger/                           ← Logging service (e.g. Winston)
    notification/                     ← Notification service
    queue/                            ← Message queue service
    socket/                           ← WebSocket service (Socket.io)

    storage/
      local/
        local-file-storage.config.ts  ← IFileSystemStorageConfig (reads env vars)
        local-storage.service.ts      ← implements IStorage + IBaseInfrastructureService
      storage-service.factory.ts      ← StorageServiceFactory implements IServiceFactory<IStorage>
      index.ts

    persistance/
      database/
        erros/
        models/                       ← Shared Mongoose schema helpers
        seeders/
        repositories/
          mongoose/
            base/
              base-repository.ts      ← BaseRepository<DBModel, DomainModel, NewDomainModel>
              base.mapper.interface.ts ← IBaseMapper<DBSchema, DomainModel, NewDomainModel>
            auth/
            erp/
              customer/
                customer.model.ts     ← INewCustomerSchema + Mongoose schema + model
                customer.mapper.ts    ← CustomerMapper implements IBaseMapper
                customer.repository.ts ← CustomerRepository extends BaseRepository
              invoice/
              item/
              order/
              payment/
              purchase-order/
              shipping/
              vendor/
            settings/
            user/
            ledger-entries/
        service/
          database-mapper/
            driver/
              mongoose.config.ts      ← IMongooseConfig (reads MONGODB_URI from env)
              mongoose.driver.ts      ← MongooseDriver implements ICoreDriver
              mongoose.driver.loader.ts ← creates + inits MongooseDriver
            mongoose.service.ts       ← MongooseService implements IDatabaseMapper
          database-mapper-service.factory.ts ← DatabaseMapperServiceFactory implements IServiceFactory<IDatabaseMapper>
          index.ts

    health/
      infrastructure-health-check.service.ts

    infrastructure.loader.ts          ← Array of all InfrastructureFactoryClass constructors
    infrastructure.manager.ts         ← InfrastructureManager.init() — iterates loader, registers in DI
    index.ts

  application/
    interfaces/
      infrastructure/
        core/
          base-infrastructure-service.interface.ts ← IBaseInfrastructureService
          circuit-breaker.interface.ts             ← ICircuitBreaker + ICircuitBreakerOptions
          circuit-breaker-status.interface.ts      ← ICircuitBreakerStatus + CircuitState
        database-mapper.interface.ts  ← IDatabaseMapper + TransactionOptions type
        cache.interface.ts            ← ICache
        storage.interface.ts          ← IStorage
        email.interface.ts            ← IEmail
        logger.interface.ts           ← ILogger
        http-client.interface.ts      ← IHTTPClient + RequestConfig type
        queue.interface.ts            ← IQueue
        socket.interface.ts           ← ISocket
        notification.interface.ts     ← INotification
        health-check.interface.ts     ← IHealthCheck
        infrastructure-manager.interface.ts ← IInfrastructureManager
      repositories/
        base.repository.interface.ts  ← IBaseRepository<DBSchema, DomainModel, NewDomainModel>
    services/
      base/
        base.application.service.ts   ← BaseApplicationService (provides dbTransaction())
      order/
        order.application.service.ts
      purchase-order/
        purchase-order.application.service.ts

  domain/
    base/
      DomainEntity.ts
      service/
        base.domain.service.ts        ← BaseDomainService (empty base)
        domain-service.error.ts       ← DomainServiceError + error types
    erp/
      customer-service/
        models/
          customer.ts                 ← INewCustomer, ICustomer, NewCustomer, Customer
        service/
          customer.service.ts         ← CustomerService extends BaseDomainService
      invoice-service/
      item-ledger-entry-service/
      order-service/
      ...
    user/
      models/
        user.ts
      service/
        ...
    shared/
      erp/
        types.ts                      ← Shared ERP types (IContact, etc.)

  presentation/
    http/
      controllers/
        base.controller.ts            ← BaseController (catchExceptionsWrapper, getPaginator)
        customer/
          customer.controller.ts
        auth/
        health/
        ...
      middleware/
        RequestValidatorMiddleware.ts ← Validates request body using express-validator Schema
        UserValidatorMiddleware.ts    ← Authenticates JWT token, attaches req.user
      routes/
        index.ts                      ← Main Express router (mounts all sub-routers)
        customer.routes.ts
        auth.routes.ts
        health.routes.ts
        ...
      validators/
        customer/
          customer.validator.ts
        auth/
        item/
        ...

  index.ts                            ← Application entry point
```

## Pattern Implementation

### 1. Core Infrastructure Interfaces

**`IBaseInfrastructureService`** — every infrastructure service must implement this

**Location**: `src/application/interfaces/infrastructure/core/base-infrastructure-service.interface.ts`

```typescript
export interface IBaseInfrastructureService {
  serviceName(): string;
  singleton(): boolean;
  deferred(): boolean;
  getDriver: () => unknown;

  /** Optional — close connections, flush buffers, etc. */
  shutdown?(): Promise<void>;
  isShuttingDown?(): boolean;
}
```

**`IServiceFactory<T>`** — every infrastructure factory must implement this

**Location**: `src/infrastructure/core/interfaces/service.factory.interface.ts`

```typescript
// Parameters are named after the registration names of the services it needs; Awilix injects them by name.
export type ServiceClosure<T> = FunctionReturning<T>; // from 'awilix'

export interface IServiceFactory<T extends IBaseInfrastructureService> {
  name(): ReturnType<T['serviceName']>; // DI registration name — equals the service's serviceName()
  create(): Promise<T | ServiceClosure<T>>; // the service, or a synchronous closure that builds it
}
```

**`IDriverConfig`** — base config interface for all drivers

**Location**: `src/infrastructure/core/driver/core.driver.config.ts`

```typescript
export interface IDriverConfig {
  driverName: string;
  singleton: boolean;
  deferred: boolean;
  optional?: boolean;
}
```

**`ICoreDriver<ClientType, ConfigType>`** — interface for all low-level drivers

**Location**: `src/infrastructure/core/driver/core.driver.ts`

```typescript
export interface ICoreDriver<T, K extends IDriverConfig> {
  init: () => Promise<void>;
  config(): K;
  client: () => T | undefined;
  shutdown: () => Promise<void>;
  health?: () => Promise<IDriverHealthStatus>;
}
```

---

### 2. Application Service Interfaces

**Purpose**: Define the contracts that application and domain layers depend on. All extend `IBaseInfrastructureService` and declare their specific `serviceName` as a string literal type.

**Location**: `src/application/interfaces/infrastructure/`

```typescript
// storage.interface.ts
import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface IStorage extends IBaseInfrastructureService {
  serviceName(): 'storage';
  singleton(): true;
  deferred(): false;

  getRoot(): Promise<string>;
  listFiles(folderPath: string): Promise<string[]>; // [] when the folder does not exist
  createFile(path: string, content: Buffer): Promise<void>;
  readFile(path: string): Promise<Buffer | null>; // null when the file does not exist
  updateFile(path: string, content: Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(srcPath: string, destPath: string): Promise<void>;
  createFolder(path: string): Promise<void>;
  deleteFolder(path: string): Promise<void>;
}
```

```typescript
// database-mapper.interface.ts
import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export type TransactionOptions = {
  session?: unknown; // Mongoose ClientSession, Sequelize Transaction, etc.
};

export interface IDatabaseMapper extends IBaseInfrastructureService {
  serviceName(): 'database_mapper';
  singleton(): true;
  deferred(): false;

  mapper(): unknown;
  transaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T>;
}
```

> **IMPORTANT**: `TransactionOptions` (not `session?: unknown` directly) is the type passed through domain services and repositories for transaction support.

```typescript
// http-client.interface.ts
import type { IHTTPResponse } from './http-response.interface';
import type { IBaseInfrastructureService } from './base-infrastructure-service.interface';

export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: Record<string, unknown> | Record<string, unknown>[] | undefined;
  timeout?: number;
};

export interface IHTTPClient extends IBaseInfrastructureService {
  serviceName(): 'httpClient';
  singleton(): true;
  deferred(): false;

  get(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
  post(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
  put(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
  patch(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
  delete(config: Omit<RequestConfig, 'method'>): Promise<IHTTPResponse>;
}
```

> **NOTE**: `RequestConfig.data` accepts a single object **or an array of objects** — arrays enable
> batch request bodies. The explicit `| undefined` in its type is required because the project
> compiles with `exactOptionalPropertyTypes: true`; keep it when modifying the type. `GET`/`DELETE`
> ignore `data`. `RequestConfig` is the single source of truth for the request shape —
> `HTTPClientService.createRequest()` reuses it; never duplicate the shape inline.

---

### 3. Service Configuration (inside each service's folder)

**Purpose**: Service-specific configurations are NOT in `app/core/config/`. Each service has its own config file that reads from env vars. These config interfaces extend `IDriverConfig`.

**Location**: Next to the service implementation in `infrastructure/{service}/`

```typescript
// infrastructure/storage/local/local-file-storage.config.ts
import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

export interface IFileSystemStorageConfig extends IDriverConfig {
  params: {
    rootPath: string;
  };
}

export const storageConfig = (): IFileSystemStorageConfig => ({
  driverName: 'storage',
  singleton: false,
  deferred: true,
  optional: process.env.STORAGE_SERVICE_OPTIONAL === 'false',
  params: {
    rootPath: process.env.STORAGE_ROOT_PATH || './storage',
  },
});
```

---

### 4. Service Implementation

**Purpose**: Application-facing service implementing the interface from `application/interfaces/infrastructure/`. Reads its config on construction. For simple services (e.g. local storage), there is no separate driver — the service IS the implementation.

**Location**: `infrastructure/{service}/{impl}/`

```typescript
// infrastructure/storage/local/local-storage.service.ts
import * as fs from 'fs/promises';
import * as path from 'path';

import type { IStorage } from '@/application/interfaces/infrastructure/storage.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { storageConfig } from './local-file-storage.config';

// Shape check rather than `instanceof Error`: fs errors can come from another realm (e.g. under Jest).
function isNotFoundError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && e.code === 'ENOENT';
}

export class LocalStorageService implements IStorage {
  private readonly rootPath: string;

  constructor() {
    const config = storageConfig();
    this.rootPath = config.params.rootPath;
  }

  serviceName(): 'storage' {
    return 'storage';
  }
  singleton(): true {
    return true;
  }
  deferred(): false {
    return false;
  }
  getDriver() {
    return null;
  }

  async createFile(filePath: string, content: Buffer): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to create file "${filePath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { filePath, cause: e }, // keep the original error for the logs
      );
    }
  }

  async readFile(filePath: string): Promise<Buffer | null> {
    const fullPath = path.join(this.rootPath, filePath);
    try {
      return await fs.readFile(fullPath);
    } catch (e: unknown) {
      if (isNotFoundError(e)) {
        return null; // "missing" is an answer, not a failure — the caller decides (e.g. NOT_FOUND)
      }
      throw new InfrastructureError(
        `Failed to read file "${filePath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { filePath, cause: e },
      );
    }
  }

  // ... other IStorage methods follow the same pattern
}
```

For services with a driver (e.g. database), the service is created by first constructing the driver, then passing it to the service:

```typescript
// infrastructure/persistance/database/service/database-mapper/mongoose.service.ts
import type {
  IDatabaseMapper,
  TransactionOptions,
} from '@/application/interfaces/infrastructure/database-mapper.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { isConnectionFailure, isMongooseDriverError } from '../../errors/mongoose-error.guards';
import { PersistanceError } from '../../errors/persistance.error';

import type mongoose from 'mongoose';
import type { MongooseDriver } from './driver/mongoose.driver';

export class MongooseService implements IDatabaseMapper {
  private driver: MongooseDriver;
  private client: mongoose.Mongoose;

  constructor(driver: MongooseDriver) {
    this.driver = driver;
    const client = driver.client();
    if (!client) {
      throw new PersistanceError('Invalid Mongoose client provided to MongooseService');
    }
    this.client = client;
  }

  serviceName(): 'database_mapper' {
    return 'database_mapper';
  }
  singleton(): true {
    return true;
  }
  deferred(): false {
    return false;
  }
  getDriver() {
    return this.driver;
  }
  mapper() {
    return this.client;
  }

  async transaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T> {
    const connection = this.client.connection;
    try {
      // `await` is required — without it a rejection bypasses this catch.
      // connection.transaction() wraps session.withTransaction(): commit on success, abort on error,
      // and automatic retry of the callback on TransientTransactionError (e.g. write conflicts).
      return await connection.transaction((session) => callback({ session }));
    } catch (err: unknown) {
      // Translate only here, after withTransaction has finished — it retries only while the raw
      // MongoError is still unwrapped. Errors thrown by the callback itself (DomainServiceError, …)
      // are rethrown unchanged so they keep their type and HTTP status.
      if (!isMongooseDriverError(err)) {
        throw err;
      }
      const message = `Failed to execute transaction: ${err.message}`;
      if (isConnectionFailure(err, connection.readyState)) {
        throw new InfrastructureError(message, 'CONNECTION_ERROR', { cause: err });
      }
      throw new PersistanceError(message, { cause: err });
    }
  }

  async shutdown(): Promise<void> {
    await this.client.connection.close();
  }
}
```

---

### 5. Driver (for services that need one)

**Purpose**: Low-level client connections. Implements `ICoreDriver<ClientType, ConfigType>`. Used internally by the service — never registered in the DI container directly.

**Location**: `infrastructure/{service}/{impl}/driver/`

```typescript
// infrastructure/persistance/database/service/database-mapper/driver/mongoose.config.ts
import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';
import type mongoose from 'mongoose';

export interface IMongooseConfig extends IDriverConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export const mongooseConfig = (): IMongooseConfig => ({
  driverName: 'mongoose',
  singleton: true,
  deferred: true,
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite-node-application',
});
```

```typescript
// infrastructure/persistance/database/service/database-mapper/driver/mongoose.driver.ts
import mongoose from 'mongoose';
import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';
import type { IMongooseConfig } from './mongoose.config';

export class MongooseDriver implements ICoreDriver<typeof mongoose, IMongooseConfig> {
  private _config: IMongooseConfig;
  private _client: typeof mongoose | undefined;

  constructor(config: IMongooseConfig) {
    this._config = config;
  }

  async init(): Promise<void> {
    const conn = await mongoose.connect(this._config.uri, this._config.options);
    this._client = conn;
  }

  config(): IMongooseConfig {
    return this._config;
  }
  client(): typeof mongoose | undefined {
    return this._client;
  }

  async shutdown(): Promise<void> {
    await this._client?.disconnect();
  }
}
```

**Driver Loader** (used by factory to build a ready driver):

```typescript
// infrastructure/persistance/database/service/database-mapper/driver/mongoose.driver.loader.ts
import { MongooseDriver } from './mongoose.driver';
import { mongooseConfig } from './mongoose.config';

export const mongooseDriverLoader = async (): Promise<MongooseDriver> => {
  const driver = new MongooseDriver(mongooseConfig());
  await driver.init();
  return driver;
};
```

---

### 6. Service Factory

**Purpose**: Creates a ready service instance based on env var configuration. Implements `IServiceFactory<InterfaceType>`. Reads the driver (via env var switch), constructs the driver if needed, then returns the service. `name()` returns the service's registration name — the same literal as its `serviceName()`.

**Location**: `infrastructure/{service}/{service}-service.factory.ts`

```typescript
// infrastructure/storage/storage-service.factory.ts
import type { IStorage } from '@/application/interfaces/infrastructure/storage.interface';
import type { IServiceFactory } from '../core/interfaces/service.factory.interface';
import { LocalStorageService } from './local/local-storage.service';
import { InfrastructureError } from '../core/errors/infrastructure.error';

export class StorageServiceFactory implements IServiceFactory<IStorage> {
  name(): 'storage' {
    return 'storage';
  }

  async createLocalStorageService(): Promise<IStorage> {
    return new LocalStorageService();
  }

  async create(): Promise<IStorage> {
    const driver = process.env.STORAGE_DRIVER || 'local';
    switch (driver) {
      case 'filesystem':
        return new LocalStorageService();
      case 'aws':
        throw new InfrastructureError('AWS S3 storage service not yet implemented', 'DRIVER_ERROR', { driver });
      case 'gcp':
        throw new InfrastructureError('Google Cloud Storage service not yet implemented', 'DRIVER_ERROR', { driver });
      case 'azure':
        throw new InfrastructureError('Azure Blob Storage service not yet implemented', 'DRIVER_ERROR', { driver });
      default:
        throw new InfrastructureError(`Unsupported storage driver: ${driver}`, 'DRIVER_ERROR', { driver });
    }
  }
}
```

```typescript
// infrastructure/persistance/database/service/database-mapper-service.factory.ts
import type { IDatabaseMapper } from '@/application/interfaces/infrastructure/database-mapper.interface';
import type { IServiceFactory } from '@/infrastructure/core/interfaces/service.factory.interface';
import { MongooseService } from './database-mapper/mongoose.service';
import { mongooseDriverLoader } from './database-mapper/driver/mongoose.driver.loader';
import { InfrastructureError } from '../../core/errors/infrastructure.error';

export class DatabaseMapperServiceFactory implements IServiceFactory<IDatabaseMapper> {
  name(): 'database_mapper' {
    return 'database_mapper';
  }

  async createMongooseService(): Promise<IDatabaseMapper> {
    const mongooseService = new MongooseService(await mongooseDriverLoader());
    return mongooseService;
  }

  async create(): Promise<IDatabaseMapper> {
    const driver = process.env.DATABASE_MAPPER_DRIVER || 'mongoose';
    switch (driver) {
      case 'mongoose':
        return this.createMongooseService();
      case 'sequelize':
        throw new InfrastructureError('Sequelize ORM service not yet implemented', 'DRIVER_ERROR', { driver });
      case 'typeorm':
        throw new InfrastructureError('TypeORM service not yet implemented', 'DRIVER_ERROR', { driver });
      case 'prisma':
        throw new InfrastructureError('Prisma ORM service not yet implemented', 'DRIVER_ERROR', { driver });
      default:
        throw new InfrastructureError(`Unsupported ORM driver: ${driver}`, 'DRIVER_ERROR', { driver });
    }
  }
}
```

**A service that needs other infrastructure services**: `create()` does the async driver setup, then returns a **synchronous closure** whose parameters are named after the registration names of the services it needs. The manager registers the closure as a singleton and Awilix injects the parameters by name (CLASSIC) when it is resolved:

```typescript
async create(): Promise<IEmail | ServiceClosure<IEmail>> {
  const driver = await smtpDriverLoader();
  return (queue: IQueue, logger: ILogger): IEmail => new QueuedEmailService(driver, queue, logger);
}
```

The closure must not be `async`: Awilix registers whatever it returns, so every consumer would receive a Promise. A dependency that is not registered fails startup with `InfrastructureError` `DRIVER_ERROR` naming the service and the dependency — in the worker and the seeder too, which leave out the socket service.

---

### 7. Infrastructure Loader Registry

**Purpose**: A single array that declares which factory classes exist. `InfrastructureManager` iterates this to instantiate and register all infrastructure services.

**Location**: `src/infrastructure/infrastructure.loader.ts`

```typescript
import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';
import type { IServiceFactory } from './core/interfaces/service.factory.interface';

import { CacheServiceFactory } from './cache';
import { EmailServiceFactory } from './email';
import { LoggerServiceFactory } from './logger';
import { NotificationServiceFactory } from './notification';
import { DatabaseMapperServiceFactory } from './persistance/database/service';
import { QueueServiceFactory } from './queue';
import { SocketServiceFactory } from './socket/socket-service.factory';
import { StorageServiceFactory } from './storage';
import { HTTPClientServiceFactory } from './http';

export type InfrastructureFactoryClass = new () => IServiceFactory<IBaseInfrastructureService>;

export const infrastructureLoader: InfrastructureFactoryClass[] = [
  CacheServiceFactory,
  EmailServiceFactory,
  LoggerServiceFactory,
  NotificationServiceFactory,
  DatabaseMapperServiceFactory,
  QueueServiceFactory,
  SocketServiceFactory,
  StorageServiceFactory,
  HTTPClientServiceFactory,
];
```

> **To add a new infrastructure service**: Create the factory class, then add it to this array, in any position — every service is registered before any is resolved, so the order does not matter. No changes needed in `app.ts` or `InfrastructureManager`.

---

### 8. InfrastructureManager (Bootstrap Orchestrator)

**Purpose**: Builds every infrastructure service from `infrastructureLoader` in three phases:

1. **Register** — calls each `factory.create()` and registers the result under `factory.name()`: a service with `asValue()`, a closure as a singleton whose parameters are injected by name.
2. **Resolve** — resolves every service. Awilix builds a closure's dependencies inside the call that builds the closure, so the loader order does not matter. A missing or cyclic dependency, a `serviceName()` that differs from the factory's `name()`, or `singleton()` returning `false` fails here with `InfrastructureError` `DRIVER_ERROR`.
3. **Track** — only once every service has resolved, adds them to the health check and to the shutdown list, in the order they were built. `shutdown()` walks that list backwards, so dependents stop before their dependencies.

**Location**: `src/infrastructure/infrastructure.manager.ts`

**Contract**: `IInfrastructureManager` (`init`, `initForWorker`, `shutdown`) in `src/application/interfaces/infrastructure/infrastructure-manager.interface.ts`. `app.ts` and `worker.ts` hold the manager through this interface.

```typescript
export class InfrastructureManager implements IInfrastructureManager {
  private services: IBaseInfrastructureService[] = [];

  private async loadServices(container: AwilixContainer, loader: InfrastructureFactoryClass[]): Promise<void> {
    const factories = loader.map((FactoryClass) => new FactoryClass());
    const built: IBaseInfrastructureService[] = []; // dependencies before their dependents

    // 1. Register
    for (const factory of factories) {
      const created = await factory.create();
      if (typeof created === 'function') {
        // Singleton resolver around asFunction(created).classic() that pushes the service to `built` when built
        container.register({ [factory.name()]: this.closureResolver(created, built) });
      } else {
        built.push(created);
        container.register({ [factory.name()]: asValue(created) });
      }
    }

    // 2. Resolve (AwilixResolutionError → InfrastructureError DRIVER_ERROR)
    for (const factory of factories) {
      this.assertService(this.resolveService(container, factory.name()), factory.name());
    }

    // 3. Track
    for (const service of built) {
      this.services.push(service);
      this.healthCheckService.registerService(service);
    }
  }

  async init(container: AwilixContainer): Promise<void> {
    await this.loadServices(container, this.loader);
    container.register({ healthCheck: asValue(this.healthCheckService) });
  }

  async shutdown(): Promise<void> {
    // Reverse build order: dependents before their dependencies
    for (const service of [...this.services].reverse()) {
      await service.shutdown?.();
    }
  }
}
```

---

### 9. Application Bootstrap (app.ts)

**Purpose**: Wire everything together at startup. `InfrastructureManager.init()` is called first. After it resolves, `autoRegisterApplicationComponents()` auto-registers all domain services, repositories, and controllers.

```typescript
// src/app/app.ts (relevant portion)
class InfiniteNodeApplication {
  private infrastructureManager: IInfrastructureManager;

  constructor(routes: Router, shutdownManager?: ShutdownManager) {
    this.container = container;
    this.express_server = this.initExpressServer(config);
    this.httpServer = this.initHttpServer();

    this.infrastructureManager = new InfrastructureManager();
    this.infrastructureManager.init(this.container).then(async () => {
      // Auto-registers *.service.ts, *.repository.ts, *.controller.ts by naming convention
      autoRegisterApplicationComponents();

      await this.initCoreMiddleware();
      this.express_server.use(scopePerRequest(this.container));
      this.express_server.use(config.app.apiUrlPrefix, routes);
    });
  }
}
```

**`autoRegisterApplicationComponents()`** scans these glob patterns and registers each class as a singleton by its camelCase class name:

| Pattern                                                                        | Example file              | Registered name             |
| ------------------------------------------------------------------------------ | ------------------------- | --------------------------- |
| `src/application/services/**/*.service.{ts,js}`                                | `OrderApplicationService` | `'orderApplicationService'` |
| `src/domain/**/service/*.service.{ts,js}`                                      | `CustomerService`         | `'customerService'`         |
| `src/infrastructure/persistance/database/repositories/**/*.repository.{ts,js}` | `CustomerRepository`      | `'customerRepository'`      |
| `src/presentation/http/controllers/**/*.controller.{ts,js}`                    | `CustomerController`      | `'customerController'`      |

> **CRITICAL**: All auto-registered classes **MUST have a `export default ClassName;`** at the bottom of the file or Awilix will not register them.

---

### 10. Persistence Layer — Schema, Mapper, Repository

#### 10a. Mongoose Schema Model

**Location**: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.model.ts`

```typescript
// customer.model.ts
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

// ⚠️ ONLY export INew{Model}Schema — do NOT add IModel or IModelSchema here
export interface INewCustomerSchema {
  _id?: Types.ObjectId;
  no: string;
  name: string;
  balance_lcy: number;
  // ... other fields
}

export const CustomerSchema = new Schema<INewCustomerSchema>(
  {
    no: { type: String, required: true },
    name: { type: String, required: true },
    balance_lcy: { type: Number, default: 0 },
    // ... other fields
  },
  { timestamps: true },
);

export const CustomerModel = model('customer', CustomerSchema);
```

> **RULE**: Only one schema interface (`INew{Model}Schema`). Never add `IModel extends INew{Model}Schema` here. The mapper handles `_id` via an intersection type.

#### 10b. Mapper

**Location**: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.mapper.ts`

```typescript
// customer.mapper.ts
import { Types } from 'mongoose';

import type { NewCustomer } from '@/domain/erp/customer-service/models/customer';
import { Customer } from '@/domain/erp/customer-service/models/customer';
import type { IBaseMapper } from '../base/base.mapper.interface';
import type { INewCustomerSchema } from './customer.model';

export class CustomerMapper implements IBaseMapper<INewCustomerSchema, Customer, NewCustomer> {
  // ✅ Use intersection type — never create a separate ICustomerSchema interface
  toDomain(data: INewCustomerSchema & { _id: Types.ObjectId }): Customer {
    return new Customer({
      id: data._id.toString(),
      no: data.no,
      name: data.name,
      balance_lcy: data.balance_lcy,
      // ... map all fields
    });
  }

  toPersistence(data: NewCustomer): INewCustomerSchema {
    // Only include _id if it exists on the domain model
    return !data.id
      ? { no: data.no, name: data.name, balance_lcy: data.balance_lcy }
      : { _id: new Types.ObjectId(data.id), no: data.no, name: data.name, balance_lcy: data.balance_lcy };
  }
}
```

**`IBaseMapper` interface**:

```typescript
// base/base.mapper.interface.ts
import type { Types } from 'mongoose';

export interface IBaseMapper<DBSchema, DomainModel, NewDomainModel> {
  toDomain(data: DBSchema & { _id: Types.ObjectId }): DomainModel;
  toPersistence(data: NewDomainModel): DBSchema;
}
```

#### 10c. Repository

**Location**: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.repository.ts`

```typescript
// customer.repository.ts
import type { Customer, NewCustomer } from '@/domain/erp/customer-service/models/customer';
import { BaseRepository } from '../../base/base-repository';
import { CustomerMapper } from './customer.mapper';
import { CustomerModel } from './customer.model';
import type { INewCustomerSchema } from './customer.model';

export class CustomerRepository extends BaseRepository<INewCustomerSchema, Customer, NewCustomer> {
  constructor() {
    super(CustomerModel, new CustomerMapper());
  }
}

export default CustomerRepository;
```

**Base Repository inherited methods** (all accept optional `transactionOptions?: TransactionOptions`):

| Method     | Signature                                                                           |
| ---------- | ----------------------------------------------------------------------------------- |
| `create`   | `(item: NewDomainModel, opts?: TransactionOptions): Promise<DomainModel>`           |
| `findById` | `(id: string, opts?: TransactionOptions): Promise<DomainModel \| null>`             |
| `findOne`  | `(filter: Partial<DBModel>, sort?, opts?): Promise<DomainModel \| null>`            |
| `find`     | `(filter: Partial<DBModel>, limit?, offset?, sort?, opts?): Promise<DomainModel[]>` |
| `count`    | `(filter: Partial<DBModel>, opts?): Promise<number>`                                |
| `update`   | `(id: string, item: NewDomainModel, opts?): Promise<DomainModel>`                   |
| `delete`   | `(id: string, opts?): Promise<void>`                                                |

**Error handling**: every inherited method runs inside `protected wrapDatabaseErrors(operation, fn)`,
and a custom query method in a concrete repository must too
(`return this.wrapDatabaseErrors('findByEmail', async () => { ... })`, mapper calls included). It
classifies what `fn` throws, in this order:

1. A `MongoError` labelled `TransientTransactionError` / `UnknownTransactionCommitResult` → rethrown
   unchanged, so `withTransaction` can retry
2. A malformed ObjectId — a Mongoose `CastError` (`kind: 'ObjectId'`), or the `BSONError` a mapper's
   `new Types.ObjectId()` throws → `RepositoryError` `INVALID_ID`
3. Anything that is not a Mongoose / MongoDB / BSON error (a mapper's `DomainEntityError`, a
   `TypeError`) → rethrown unchanged
4. E11000 duplicate key → `RepositoryError` `DUPLICATE_KEY`
5. A network / server-selection / closed-client error, or any driver error while the connection is
   not open (Mongoose's buffering timeout) → `InfrastructureError` `CONNECTION_ERROR`
6. Anything else → `PersistanceError` (`DATABASE_ERROR`)

`RepositoryError` (`@/infrastructure/core/errors/repository.error`) is rejected caller data, not an
infrastructure failure, so it does not extend `InfrastructureError`; `wrapInfrastructureErrors()`
maps it to a `DomainServiceError` (§11b). Every translated error keeps the original in `data.cause`.

---

### 11. Domain Layer — Model and Service

#### 11a. Domain Model

**Location**: `src/domain/{feature}/models/{model-name}.ts`

```typescript
// domain/erp/customer-service/models/customer.ts

export interface INewCustomer {
  // For user input / creation (id optional)
  id?: string;
  no: string;
  name: string;
  balance_lcy?: number;
  // ...
}

export interface ICustomer extends INewCustomer {
  // For existing DB entities (id required)
  id: string;
}

export class NewCustomer extends DomainEntity {
  // For creating new entities
  protected _id?: string;
  protected _no: string;
  // ...
  constructor(data: INewCustomer) {
    super(); /* ... */
  }
  get id(): string | undefined {
    return this._id;
  }
  get no(): string {
    return this._no;
  }
}

export class Customer extends NewCustomer {
  // For existing entities from DB
  protected _id: string;
  constructor(data: ICustomer) {
    super(data);
    this._id = data.id;
  }
  get id(): string {
    return this._id;
  }
}

export default Customer;
```

| Context                     | Type to use          |
| --------------------------- | -------------------- |
| Request body / creation     | `INewModel`          |
| Domain service create param | `INewModel`          |
| Domain service update param | `Partial<INewModel>` |
| Repository return           | `Model`              |
| Domain service return       | `Model`              |

#### 11b. Domain Service

**Location**: `src/domain/{feature}/service/{feature}.service.ts`

```typescript
// domain/erp/customer-service/service/customer.service.ts
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { CustomerRepository } from '@/infrastructure/persistance/database/repositories/mongoose/erp/customer/customer.repository';
import { NewCustomer, type Customer, type INewCustomer } from '../models/customer';
import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

export class CustomerService extends BaseDomainService {
  private readonly customerRepository: CustomerRepository;

  constructor(customerRepository: CustomerRepository) {
    super();
    this.customerRepository = customerRepository;
  }

  async createCustomer(data: INewCustomer, transactionOptions?: TransactionOptions): Promise<{ id: string }> {
    const existing = await this.customerRepository.findOne({ no: data.no }, {}, transactionOptions);
    if (existing) {
      throw new DomainServiceError(`Customer with no '${data.no}' already exists`, 'ALREADY_EXISTS');
    }
    const customer = await this.customerRepository.create(new NewCustomer(data), transactionOptions);
    return { id: customer.id };
  }

  async getCustomers(limit: number, offset: number): Promise<Customer[]> {
    return this.customerRepository.find({}, limit, offset);
  }

  async getCustomerById(id: string, transactionOptions?: TransactionOptions): Promise<Customer> {
    const customer = await this.customerRepository.findById(id, transactionOptions);
    if (!customer) throw new DomainServiceError(`Customer with id '${id}' not found`, 'NOT_FOUND');
    return customer;
  }

  async countCustomers(): Promise<number> {
    return this.customerRepository.count({});
  }
}

export default CustomerService;
```

**`DomainServiceError` types** (caught automatically by `catchExceptionsWrapper` in `BaseController`):

| Type                      | HTTP status |
| ------------------------- | ----------- |
| `'AUTHENTICATION_ERROR'`  | 401         |
| `'USER_PERMISSION_ERROR'` | 403         |
| `'NOT_FOUND'`             | 404         |
| `'ALREADY_EXISTS'`        | 400         |
| `'VALIDATION_ERROR'`      | 400         |
| `'INVALID_OPERATION'`     | 400         |
| `'INCOMPLETE_MODEL'`      | 400         |
| `'UNKNOWN_ERROR'`         | 500         |
| `'INFRASTRUCTURE_ERROR'`  | 503 / 500   |

- Use `'ALREADY_EXISTS'` for a duplicate unique value; `'VALIDATION_ERROR'` for other rule violations.
- `'INFRASTRUCTURE_ERROR'` is produced only by `wrapInfrastructureErrors()`: 503 when the original
  infrastructure type (`data.type`) is `NETWORK_ERROR` / `CONNECTION_ERROR`, otherwise 500 — always
  with a generic message, never the infrastructure error's own.
- `wrapInfrastructureErrors()` maps a repository's `RepositoryError` (§10c) first: `DUPLICATE_KEY` →
  `'ALREADY_EXISTS'`, `INVALID_ID` → `'VALIDATION_ERROR'`, each with a fixed client-safe message (the
  repository's message holds index names and key values) and without calling `onError`.

---

### 12. Application Service (for Transactions / Orchestration)

**Use when**: an operation must span multiple domain services within a single DB transaction, or application-level orchestration is needed.

**Location**: `src/application/services/{feature}/{feature}.application.service.ts`

```typescript
import { BaseApplicationService } from '../base/base.application.service';
import type { IDatabaseMapper } from '@/application/interfaces';
import type { CustomerService } from '@/domain/erp/customer-service/service/customer.service';
import type { INewCustomer } from '@/domain/erp/customer-service/models/customer';

export class CustomerApplicationService extends BaseApplicationService {
  private customerService: CustomerService;

  // ⚠️ IDatabaseMapper (as databaseMapperService) MUST be the first constructor parameter
  constructor(databaseMapperService: IDatabaseMapper, customerService: CustomerService) {
    super(databaseMapperService);
    this.customerService = customerService;
  }

  async createWithRelatedData(data: INewCustomer): Promise<{ id: string }> {
    return this.dbTransaction(async (transactionOptions) => {
      // Pass transactionOptions to all domain service calls in the transaction
      const result = await this.customerService.createCustomer(data, transactionOptions);
      // ... other domain service calls with same transactionOptions
      return result;
    });
  }
}

export default CustomerApplicationService;
```

**`BaseApplicationService`**:

```typescript
export class BaseApplicationService {
  private databaseMapperService: IDatabaseMapper;
  constructor(databaseMapperService: IDatabaseMapper) {
    this.databaseMapperService = databaseMapperService;
  }

  async dbTransaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T> {
    return await this.databaseMapperService.transaction(({ session }) => {
      return callback({ session });
    });
  }
}
```

**Errors inside a transaction**: anything the callback throws propagates **unchanged** — a
`DomainServiceError` keeps its type and HTTP status. Only Mongoose / MongoDB driver failures that
escape the callback (commit failure, no replica set, lost connection) are translated by
`MongooseService.transaction()`: into `InfrastructureError` `CONNECTION_ERROR` when the database
cannot be reached, otherwise `PersistanceError`. Don't catch and re-wrap Mongo errors inside the
callback yourself: the automatic retry of transient write conflicts only happens while the raw
labelled `MongoError` escapes it — `BaseRepository.wrapDatabaseErrors()` rethrows those unchanged and
translates everything else (§10c).

---

### 13. Presentation Layer — Controller, Routes, Validators

#### 13a. Controller

**Location**: `src/presentation/http/controllers/{feature}/{model-name}.controller.ts`

```typescript
import { matchedData } from 'express-validator';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { CustomerService } from '@/domain/erp/customer-service/service/customer.service';
import type { CustomerRepository } from '@/infrastructure/persistance/database/repositories/mongoose/erp/customer/customer.repository';
import type { INewCustomer } from '@/domain/erp/customer-service/models/customer';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import { BaseController } from '../base.controller';
import type { Request, Response } from 'express';

export class CustomerController extends BaseController {
  private readonly customerService: CustomerService;
  private readonly customerRepository: CustomerRepository;

  // `logger` goes to BaseController: catchExceptionsWrapper() logs every caught exception through it
  constructor(customerService: CustomerService, customerRepository: CustomerRepository, logger: ILogger) {
    super(logger);
    this.customerService = customerService;
    this.customerRepository = customerRepository;
  }

  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewCustomer>(req);
      const result = await this.customerService.createCustomer(data);
      return ApiResponseUtils.apiOkResponse(201, false, null, 'Customer created successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const totalCount = await this.customerRepository.count({});
      const paginator = this.getPaginator(req, totalCount);
      const result = await this.customerService.getCustomers(paginator.getResultsPerPage(), paginator.getOffset());
      return ApiResponseUtils.apiOkResponse(200, true, paginator, 'Customers retrieved successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  // ... getById, update, delete follow the same pattern
}

export default CustomerController;
```

**Key rules**:

- **Always** wrap logic in `this.catchExceptionsWrapper()` — it logs and maps every thrown error: `PaginationException` / `RouteParamException` / `DomainEntityError` → 400, `DomainServiceError` → per type, `InfrastructureError` and anything unexpected → generic 503/500 (never the error's message)
- **Always** use `matchedData()` to extract validated request data
- **Always** inject the repository directly to call `count()` for pagination total
- **Always** use `this.getPaginator(req, totalCount)` — it validates `?page=` and `?limit=` params
- **Must** `export default ClassName` for Awilix auto-registration

#### 13b. Validator

**Location**: `src/presentation/http/validators/{feature}/{model-name}.validator.ts`

```typescript
import type { Schema } from 'express-validator';

export const newCustomerValidator = (): Schema => ({
  no: { notEmpty: true, isString: true, errorMessage: 'Customer number is required' },
  name: { notEmpty: true, isString: true, errorMessage: 'Customer name is required' },
  balance_lcy: { optional: true, isNumeric: true },
});

export const updateCustomerValidator = (): Schema => ({
  name: { optional: true, isString: true },
  balance_lcy: { optional: true, isNumeric: true },
});
```

#### 13c. Routes

**Location**: `src/presentation/http/routes/{feature}.routes.ts`

```typescript
import { Router, type Response } from 'express';
import { container } from '@/app/core/service.container';
import type { LoginService } from '@/domain/auth/service/login.service';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';
import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { newCustomerValidator, updateCustomerValidator } from '../validators/customer/customer.validator';
import type { CustomerController } from '../controllers/customer/customer.controller';

const router = Router();
const loginServiceProvider = () => container.resolve<LoginService>('loginService');

router.post(
  '/create',
  UserValidatorMiddleware(loginServiceProvider),
  RequestValidatorMiddleware(newCustomerValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<CustomerController>('customerController').create(req, res);
  },
);

router.get('/', UserValidatorMiddleware(loginServiceProvider), (req: AuthenticatedRequest, res: Response) => {
  container.resolve<CustomerController>('customerController').getAll(req, res);
});

router.get('/:id', UserValidatorMiddleware(loginServiceProvider), (req: AuthenticatedRequest, res: Response) => {
  container.resolve<CustomerController>('customerController').getById(req, res);
});

router.put(
  '/:id',
  UserValidatorMiddleware(loginServiceProvider),
  RequestValidatorMiddleware(updateCustomerValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<CustomerController>('customerController').update(req, res);
  },
);

router.delete('/:id', UserValidatorMiddleware(loginServiceProvider), (req: AuthenticatedRequest, res: Response) => {
  container.resolve<CustomerController>('customerController').delete(req, res);
});

export { router as CustomerRoutes };
```

**Middleware rules**:

- `UserValidatorMiddleware` — authenticates the JWT token and attaches `req.user`; **every protected route must use it**
- `RequestValidatorMiddleware` — runs express-validator schema against the request body; use for create/update routes

---

## Key Benefits of This Pattern

### 1. **Complete Separation of Concerns**

- **Drivers** (`ICoreDriver`): Raw client connections (Mongoose, Redis, etc.)
- **Services** (`IBaseInfrastructureService`): Application-facing API implementations
- **Factories** (`IServiceFactory<T>`): Determine implementations from env vars at boot
- **Application layer**: Uses only interfaces, never imports concrete infrastructure classes

### 2. **Easy Technology Swapping**

Change from local storage to AWS S3:

- Update `.env`: `STORAGE_DRIVER=aws`
- Implement `AWSStorageService implements IStorage`
- Add `case 'aws':` in `StorageServiceFactory.create()`
- **Zero changes** to application/domain/presentation code

### 3. **Testability**

```typescript
// Easy to mock in tests — depend only on the interface
const mockStorage: IStorage = {
  serviceName: () => 'storage',
  singleton: () => true,
  deferred: () => false,
  getDriver: () => null,
  createFile: jest.fn(),
  readFile: jest.fn(),
  deleteFile: jest.fn(),
  // ...
};
```

### 4. **Boot-time Initialization**

- `InfrastructureManager.init()` runs before any request is handled
- All infrastructure services are registered in the Awilix container before routes are mounted
- `autoRegisterApplicationComponents()` runs after infrastructure is ready, ensuring repositories/services can resolve their dependencies

### 5. **Infrastructure Independence**

- Domain layer never imports from `infrastructure/`
- Application services inject dependencies by interface type, resolved from the DI container
- Swap any infrastructure technology without touching business logic

---

## Summary

The infrastructure initialization lifecycle:

```
index.ts
  → new InfiniteNodeApplication(routes, shutdownManager)
      → new InfrastructureManager()
      → infrastructureManager.init(container)
            → for each FactoryClass in infrastructureLoader:
                  factory = new FactoryClass()
                  created = await factory.create()          ← reads env vars, inits driver if needed
                  container.register({ [factory.name()]: asValue(created) or singleton closure })
            → resolve every factory.name()                  ← closures get their dependencies by name
            → track services in build order                 ← health check + shutdown (reverse order)
      → autoRegisterApplicationComponents()                  ← scans *.service.ts, *.repository.ts, *.controller.ts
      → express app.use(routes)
```

**Adding a new infrastructure service** (complete checklist):

```
☐ Create config interface extending IDriverConfig (inside service folder)
☐ Create driver implementing ICoreDriver<ClientType, ConfigType> (if needed)
☐ Create driver loader function (if driver needed)
☐ Create application interface extending IBaseInfrastructureService (in application/interfaces/infrastructure/)
☐ Create service implementation (implements both interface AND IBaseInfrastructureService)
☐ Create factory class implementing IServiceFactory<YourInterface> — name() returns the serviceName() literal;
  create() returns a synchronous closure if the service needs other infrastructure services
☐ Export factory from infrastructure/index.ts
☐ Add factory class to infrastructureLoader array in infrastructure.loader.ts (any position)
```

**Adding a new API endpoint** (complete checklist):

```
☐ Step 1: Domain model (INewModel, IModel, NewModel, Model) in domain/{feature}/models/
      ☐ Optional: Type guard in domain/{feature}/models/guards/{name}.guards.ts — only if narrowing is needed
☐ Step 2: Mongoose schema + model (INewModelSchema only!) in infrastructure/persistance/.../mongoose/{feature}/
☐ Step 3: Mapper (toDomain, toPersistence) — use intersection type for _id
☐ Step 4: Repository extends BaseRepository — export default
☐ Step 5: Domain service extends BaseDomainService — inject repository, use TransactionOptions — export default
☐ Step 6: Application service extends BaseApplicationService (only if transactions needed) — export default
☐ Step 7: Validator (express-validator Schema functions)
☐ Step 8: Controller extends BaseController — inject service + repository — export default
☐ Step 9: Routes — wire middleware + controller resolution from DI container, then register in routes/index.ts
☐ Step 10: Seeder (only if the resource has default/bootstrap data) — {feature}.seeder.ts in
      infrastructure/persistance/database/seeders/, exporting seed{Feature}()/clear{Feature}(),
      registered BY HAND in seeders/seeder.ts (dependency-ordered)
```

<!-- keep in sync with: Docs/prompts/API_Resource_Guide.md, Docs/prompts/Domain_Model_Repository_Mapper_Guide.md -->

**Full resource file set** (reference — the complete set of files that make up one resource; some
are conditional as noted):

| #   | Layer / File                           | Path pattern                                                                                      | Purpose                                                                                                                                           |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Route                                  | `src/presentation/http/routes/{feature}.routes.ts`                                                | Wires middleware and binds URLs to controller methods resolved from the DI container                                                              |
| 2   | Controller                             | `src/presentation/http/controllers/{feature}/{name}.controller.ts`                                | Parses HTTP requests, calls the service, shapes HTTP responses                                                                                    |
| 3   | Application Service _(optional)_       | `src/application/services/{feature}/{name}.application.service.ts`                                | Orchestrates a transaction spanning multiple domain services — only when one operation must span more than one domain service                     |
| 4   | Domain Service                         | `src/domain/{feature}/service/{name}.service.ts`                                                  | Business logic and orchestration for one domain model; calls the repository                                                                       |
| 5   | Domain Model _(+ optional Type Guard)_ | `src/domain/{feature}/models/{name}.ts` (+ `src/domain/{feature}/models/guards/{name}.guards.ts`) | Source of truth for the resource's shape and invariants (`INewX`, `IX`, `NewX`, `X`); the guard narrows a union/unknown to this model when needed |
| 6   | Persistence Repository                 | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.repository.ts`    | CRUD and custom queries against MongoDB via Mongoose; extends `BaseRepository`                                                                    |
| 7   | Persistence Model (schema)             | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.model.ts`         | `INew{Model}Schema` interface + Mongoose `Schema`/`model()` — `INew{Model}Schema` only                                                            |
| 8   | Persistence Mapper                     | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.mapper.ts`        | Translates between the Mongoose document shape and the domain model (`toDomain`/`toPersistence`)                                                  |
| 9   | Seeder _(if applicable)_               | `src/infrastructure/persistance/database/seeders/{feature}.seeder.ts`                             | Bootstrap/default data — exports `seed{Feature}()`/`clear{Feature}()`, registered by hand (dependency-ordered) in `seeders/seeder.ts`             |

> **Caveat:** the mongoose repository directory name does not always match the domain feature
> folder name (e.g. domain feature `auth` maps to mongoose directories `roles/` and `resources/`
> for `role.ts`/`resource.ts`). Always verify against an existing analogous resource rather than
> assuming strict 1:1 folder naming across layers.

> ⚠️ **Keep the file set in sync.** The domain model is the source of truth for a resource's
> shape. Any change to it — adding, removing, renaming, or retyping a field, or changing a
> validation invariant — is **not complete** until it has been propagated through every other file
> in the set that touches the changed field:
>
> - **Persistence model/schema** — add/remove/rename the corresponding schema field and its type
> - **Persistence mapper** — update `toDomain`/`toPersistence` for the field
> - **Persistence repository** — update any custom queries, filters, or indexes that reference the field
> - **Validator** — update the express-validator schema for the field
> - **Controller** — update request/response shape (DTOs, serialized fields) that exposes the field
> - **Seeder** — update default/bootstrap data to match the new shape, if the resource has a seeder
>
> A change that touches only the domain model is incomplete. Treat "the domain model changed" as a
> trigger to grep the resource's other files (route, controller, application service, domain
> service, mapper, persistence model, repository, seeder) for the affected field name before
> considering the work done.
