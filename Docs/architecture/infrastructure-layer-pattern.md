# Infrastructure Layer Pattern

## Overview

This document describes the exact architectural approach for organizing infrastructure-level services (database, cache, storage, email, etc.) in this application. The pattern separates **drivers** (low-level client connections managed via `ICoreDriver`) from **services** (application-facing implementations that implement `IBaseInfrastructureService`) while maintaining clean architecture principles.

Infrastructure services are initialized at boot time by `InfrastructureManager`, which iterates a registry of factory classes (`infrastructureLoader`). Each factory implements `IServiceFactory<T>` and is responsible for reading its own configuration from environment variables, creating its driver (if applicable), and returning a ready service instance. The `InfrastructureManager` then registers each service in the Awilix DI container by the name returned from `service.serviceName()`.

## Core Principles

1. **All external system integrations belong in `src/infrastructure/`** — not in `src/app/core/`
2. **Service configuration is read from env vars inside each factory** — there are no per-service config files in `app/core/config/`; only `app.config.ts`, `server.config.ts`, and `config.ts` live there
3. **Application layer depends only on interfaces** — defined in `src/application/interfaces/`
4. **Each infrastructure service implements `IBaseInfrastructureService`** — declaring its `serviceName`, `singleton`, and `deferred` flags
5. **Each infrastructure service has a factory implementing `IServiceFactory<T>`** — factories are registered in `infrastructure.loader.ts`
6. **`InfrastructureManager` orchestrates all service initialization** — it iterates factory classes, calls `factory.create()`, and registers results in the Awilix container
7. **Drivers implement `ICoreDriver<ClientType, ConfigType>`** — only used internally by services; never registered in the DI container directly

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
        service.factory.interface.ts  ← IServiceFactory<T> { create(): Promise<T> }
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
      base.interface.ts               ← IBaseInfrastructureService
      database-mapper.interface.ts    ← IDatabaseMapper + TransactionOptions type
      cache.interface.ts              ← ICache
      storage.interface.ts            ← IStorage
      email.interface.ts              ← IEmail
      logger.interface.ts             ← ILogger
      http-client.interface.ts        ← IHttpClient
      queue.interface.ts              ← IQueue
      socket.interface.ts             ← ISocket
      notification.interface.ts       ← INotification
      health-check.interface.ts       ← IHealthCheck
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

**Location**: `src/application/interfaces/base.interface.ts`

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
export interface IServiceFactory<T> {
  create(): Promise<T>;
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

**Location**: `src/application/interfaces/`

```typescript
// storage.interface.ts
import type { IBaseInfrastructureService } from './base.interface';

export interface IStorage extends IBaseInfrastructureService {
  serviceName(): 'storage';
  singleton(): true;
  deferred(): false;

  getRoot(): Promise<string>;
  listFiles(folderPath: string): Promise<string[]>;
  createFile(path: string, content: Buffer): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  updateFile(path: string, content: Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(srcPath: string, destPath: string): Promise<void>;
  createFolder(path: string): Promise<void>;
  deleteFolder(path: string): Promise<void>;
}
```

```typescript
// database-mapper.interface.ts
import type { IBaseInfrastructureService } from './base.interface';

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

**Purpose**: Application-facing service implementing the interface from `application/interfaces/`. Reads its config on construction. For simple services (e.g. local storage), there is no separate driver — the service IS the implementation.

**Location**: `infrastructure/{service}/{impl}/`

```typescript
// infrastructure/storage/local/local-storage.service.ts
import type { IStorage } from '@/application/interfaces/storage.interface';
import { storageConfig } from './local-file-storage.config';
import * as fs from 'fs/promises';
import * as path from 'path';

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
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async readFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.rootPath, filePath);
    return await fs.readFile(fullPath);
  }

  // ... other IStorage methods
}
```

For services with a driver (e.g. database), the service is created by first constructing the driver, then passing it to the service:

```typescript
// infrastructure/persistance/database/service/database-mapper/mongoose.service.ts
import type { IDatabaseMapper, TransactionOptions } from '@/application/interfaces/database-mapper.interface';
import type { MongooseDriver } from './driver/mongoose.driver';

export class MongooseService implements IDatabaseMapper {
  private driver: MongooseDriver;
  private client: mongoose.Mongoose;

  constructor(driver: MongooseDriver) {
    this.driver = driver;
    this.client = driver.client()!;
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
    const session = await this.client.startSession();
    try {
      session.startTransaction();
      const result = await callback({ session });
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async shutdown(): Promise<void> {
    await this.driver.shutdown();
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

**Purpose**: Creates a ready service instance based on env var configuration. Implements `IServiceFactory<InterfaceType>`. Reads the driver (via env var switch), constructs the driver if needed, then returns the service.

**Location**: `infrastructure/{service}/{service}-service.factory.ts`

```typescript
// infrastructure/storage/storage-service.factory.ts
import type { IStorage } from '@/application/interfaces/storage.interface';
import type { IServiceFactory } from '../core/interfaces/service.factory.interface';
import { LocalStorageService } from './local/local-storage.service';
import { InfrastructureError } from '../core/errors/infrastructure.error';

export class StorageServiceFactory implements IServiceFactory<IStorage> {
  async createLocalStorageService(): Promise<IStorage> {
    return new LocalStorageService();
  }

  async create(): Promise<IStorage> {
    const driver = process.env.STORAGE_DRIVER || 'local';
    switch (driver) {
      case 'filesystem':
        return new LocalStorageService();
      case 'aws':
        throw new InfrastructureError('AWS S3 storage service not yet implemented');
      case 'gcp':
        throw new InfrastructureError('Google Cloud Storage service not yet implemented');
      case 'azure':
        throw new InfrastructureError('Azure Blob Storage service not yet implemented');
      default:
        throw new InfrastructureError(`Unsupported storage driver: ${driver}`);
    }
  }
}
```

```typescript
// infrastructure/persistance/database/service/database-mapper-service.factory.ts
import type { IDatabaseMapper } from '@/application/interfaces/database-mapper.interface';
import type { IServiceFactory } from '@/infrastructure/core/interfaces/service.factory.interface';
import { MongooseService } from './database-mapper/mongoose.service';
import { mongooseDriverLoader } from './database-mapper/driver/mongoose.driver.loader';
import { InfrastructureError } from '../../core/errors/infrastructure.error';

export class DatabaseMapperServiceFactory implements IServiceFactory<IDatabaseMapper> {
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
        throw new InfrastructureError('Sequelize ORM service not yet implemented');
      case 'typeorm':
        throw new InfrastructureError('TypeORM service not yet implemented');
      case 'prisma':
        throw new InfrastructureError('Prisma ORM service not yet implemented');
      default:
        throw new InfrastructureError(`Unsupported ORM driver: ${driver}`);
    }
  }
}
```

---

### 7. Infrastructure Loader Registry

**Purpose**: A single array that declares which factory classes exist. `InfrastructureManager` iterates this to instantiate and register all infrastructure services.

**Location**: `src/infrastructure/infrastructure.loader.ts`

```typescript
import type { IBaseInfrastructureService } from '@/application/interfaces/base.interface';
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

> **To add a new infrastructure service**: Create the factory class, then add it to this array. No changes needed in `app.ts` or `InfrastructureManager`.

---

### 8. InfrastructureManager (Bootstrap Orchestrator)

**Purpose**: Iterates every factory in `infrastructureLoader`, calls `factory.create()`, then registers each service in the Awilix container using the name returned by `service.serviceName()`.

**Location**: `src/infrastructure/infrastructure.manager.ts`

```typescript
export class InfrastructureManager {
  private services: IBaseInfrastructureService[] = [];

  async init(container: AwilixContainer): Promise<void> {
    for (const FactoryClass of infrastructureLoader) {
      const factory = new FactoryClass();
      const service: IBaseInfrastructureService = await factory.create();
      const serviceName = service.serviceName();

      if (service.singleton()) {
        container.register({ [serviceName]: asValue(service) });
        this.services.push(service);
      }
    }

    container.register({ healthCheck: asValue(this.healthCheckService) });
  }

  async shutdown(): Promise<void> {
    // Shutdown in reverse initialization order (LIFO)
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
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

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
| `'INCOMPLETE_MODEL'`      | 400         |
| `'UNKNOWN_ERROR'`         | 500         |

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
import { BaseController } from '../base.controller';
import type { Request, Response } from 'express';

export class CustomerController extends BaseController {
  private readonly customerService: CustomerService;
  private readonly customerRepository: CustomerRepository;

  constructor(customerService: CustomerService, customerRepository: CustomerRepository) {
    super();
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

- **Always** wrap logic in `this.catchExceptionsWrapper()` — catches `DomainServiceError` and `PaginationException`
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
                  service = await factory.create()          ← reads env vars, inits driver if needed
                  container.register({ [service.serviceName()]: asValue(service) })
      → autoRegisterApplicationComponents()                  ← scans *.service.ts, *.repository.ts, *.controller.ts
      → express app.use(routes)
```

**Adding a new infrastructure service** (complete checklist):

```
☐ Create config interface extending IDriverConfig (inside service folder)
☐ Create driver implementing ICoreDriver<ClientType, ConfigType> (if needed)
☐ Create driver loader function (if driver needed)
☐ Create application interface extending IBaseInfrastructureService (in application/interfaces/)
☐ Create service implementation (implements both interface AND IBaseInfrastructureService)
☐ Create factory class implementing IServiceFactory<YourInterface>
☐ Export factory from infrastructure/index.ts
☐ Add factory class to infrastructureLoader array in infrastructure.loader.ts
```

**Adding a new API endpoint** (complete checklist):

```
☐ Step 1: Domain model (INewModel, IModel, NewModel, Model) in domain/{feature}/models/
☐ Step 2: Mongoose schema + model (INewModelSchema only!) in infrastructure/persistance/.../mongoose/{feature}/
☐ Step 3: Mapper (toDomain, toPersistence) — use intersection type for _id
☐ Step 4: Repository extends BaseRepository — export default
☐ Step 5: Domain service extends BaseDomainService — inject repository, use TransactionOptions — export default
☐ Step 6: Application service extends BaseApplicationService (only if transactions needed) — export default
☐ Step 7: Validator (express-validator Schema functions)
☐ Step 8: Controller extends BaseController — inject service + repository — export default
☐ Step 9: Routes — wire middleware + controller resolution from DI container
```
