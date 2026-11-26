# Infrastructure layer: services, drivers and factories

How the infrastructure services are declared, built, wired into DI, health-checked and shut down: the database
mapper, cache, queue, email, push notifications, storage, logger, socket and HTTP client.

`CLAUDE.md` §11 holds the binding rules. Each card below expands one of them with its contracts, real code and more
use cases, and names the § it expands. Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins.

| For                                                                                    | Read                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| How the layers, processes and request flow fit together                                | `Docs/architecture/application-architecture.md`                        |
| Email and push notification specifics                                                  | `Docs/features/email.md`, `Docs/features/notification.md`              |
| Repositories, schemas and mappers (in `persistance/`, but not infrastructure services) | `CLAUDE.md` §6, `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md` |

## Core rules

1. Inner layers know a service only by its interface in `src/application/interfaces/infrastructure/`, injected under
   its DI token (card 1).
2. A service has three parts: a **driver** that owns the client, a **service** that implements the interface, and a
   **factory** that picks and builds them (cards 3–5).
3. Env vars are read in the driver's `*.config.ts`; the factory reads only `{NAME}_DRIVER` (card 2).
4. The factory's `name()` returns the same literal as the service's `serviceName()`: that literal is the DI token
   (card 4).
5. A service that needs other infrastructure services is returned as a synchronous closure (card 5).
6. A new service is new files plus one line in `infrastructure.loader.ts`; nothing else changes (card 6).
7. `InfrastructureManager` builds, checks, health-registers and shuts down every service; nothing else builds one
   (cards 7–8).
8. An infrastructure error means "this infrastructure failed": wrap only the driver's own failures, keep the
   original, never carry secrets (card 9).
9. A remote dependency that is not retried sits behind a circuit breaker (card 10).
10. Health comes from the driver's `health()`, never through the breaker (card 11).

## Structure

```
src/
├── application/interfaces/
│   ├── infrastructure/
│   │   ├── core/                          # IBaseInfrastructureService, ICircuitBreaker, ICircuitBreakerStatus
│   │   ├── {name}.interface.ts            # One contract per service: ICache, IQueue, IStorage, IHTTPClient, …
│   │   ├── push-notification/             # IPushNotificationService
│   │   ├── notification/                  # INotification (the notification log record)
│   │   └── infrastructure-manager.interface.ts
│   └── errors/                            # InfrastructureError, RepositoryError: every layer may import them
└── infrastructure/
    ├── core/
    │   ├── circuit-breaker/               # CircuitBreaker
    │   ├── driver/                        # ICoreDriver, IDriverHealthStatus, IDriverConfig
    │   ├── errors/                        # DriverError, CircuitOpenError
    │   └── interfaces/                    # IServiceFactory, ServiceClosure
    ├── {name}/                            # cache, email, http, logger, push-notification, queue, socket, storage
    │   ├── {driver}/
    │   │   ├── driver/                    # {driver}.config.ts, {driver}.driver.ts, {driver}.driver.loader.ts
    │   │   ├── error/                     # The driver's InfrastructureError subclass and outage guard, if any
    │   │   └── {driver}-{name}.service.ts # Implements the interface
    │   ├── {name}-service.factory.ts
    │   └── index.ts
    ├── persistance/database/service/      # The database mapper service, with the same driver/factory layout
    ├── health/                            # InfrastructureHealthCheckService
    ├── infrastructure.loader.ts           # The factory list
    └── infrastructure.manager.ts          # Builds, tracks and shuts down every service
```

File names vary a little between services (`socketio/driver/sockets.driver.ts`, `bullmq/driver/queue.config.ts`);
copy the layout of `src/infrastructure/email/` for a new one.

## Services

| Token              | Interface                  | `{NAME}_DRIVER` (default)             | Implementations                                             | Closure | Breaker      | `shutdown()` |
| ------------------ | -------------------------- | ------------------------------------- | ----------------------------------------------------------- | ------- | ------------ | ------------ |
| `database_mapper`  | `IDatabaseMapper`          | `DATABASE_MAPPER_DRIVER` (mongoose)   | `MongooseService`                                           | —       | —            | ✅           |
| `cache`            | `ICache`                   | `CACHE_DRIVER` (redis)                | `RedisCacheService`                                         | —       | —            | ✅           |
| `queue`            | `IQueue`                   | `QUEUE_DRIVER` (bullmq)               | `BullMQQueueService`                                        | —       | —            | ✅           |
| `logger`           | `ILogger`                  | `LOGGING_DRIVER` (winston)            | `WinstonLoggerService`                                      | —       | —            | ✅           |
| `emailService`     | `IEmailService`            | `EMAIL_DRIVER` (smtp)                 | `SMTPEmailService`, `SESEmailService`                       | ✅      | one          | —            |
| `pushNotification` | `IPushNotificationService` | `PUSH_NOTIFICATION_DRIVER` (inmemory) | `InMemoryNotificationService`, `SNSPushNotificationService` | —       | SNS only     | SNS only     |
| `storage`          | `IStorage`                 | `STORAGE_DRIVER` (filesystem)         | `LocalStorageService` (no driver)                           | —       | —            | —            |
| `socket`           | `ISocket`                  | `SOCKET_DRIVER` (socketio)            | `SocketIOService` (API process only)                        | —       | —            | ✅           |
| `httpClient`       | `IHTTPClient`              | none                                  | `HTTPClientService` (axios, no driver)                      | —       | one per host | —            |

## Contracts

### 1. Declare the service's contract in `application/interfaces/infrastructure`

**Expands:** `CLAUDE.md` §11.1 (step 1), §2.1
**Rule:** Each service has an interface in `src/application/interfaces/infrastructure/{name}.interface.ts` that
extends `IBaseInfrastructureService` and narrows `serviceName()` to a string literal (its DI token), `singleton()` to
`true` and `deferred()` to `false`. Domain, application and presentation code depend on this interface only.
**Why:** The interface is what lets a driver be swapped without touching the inner layers (card 14). The literal
`serviceName()` lets the compiler check that the factory's `name()` returns the same token (card 4).

```typescript
export interface IBaseInfrastructureService {
  serviceName(): string; // the DI token
  singleton(): boolean; // InfrastructureManager rejects false
  deferred(): boolean;
  getDriver: () => unknown; // read by the health check (card 11)
  shutdown?(): Promise<void>; // card 8
  isShuttingDown?(): boolean;
  circuitBreakerStatuses?(): ICircuitBreakerStatus[]; // card 10
}

export interface IStorage extends IBaseInfrastructureService {
  serviceName(): 'storage';
  singleton(): true;
  deferred(): false;

  listFiles(folderPath: string): Promise<string[]>; // [] when the folder does not exist
  readFile(path: string): Promise<Buffer | null>; // null when the file does not exist
  // ...
}
```

**Use cases:**

- "not found" is an answer the contract can give → return `null` / `[]`, never throw; the caller decides whether it
  is a `NOT_FOUND`
- a type that crosses the layer boundary → define it in the interface file without leaking the library:
  `TransactionOptions.session` is `unknown` (asserted only in a Mongoose repository, §12.6 case 2), `RequestConfig` is
  a plain object type, not an Axios one
- every error an implementation can throw → in that method's `@throws`, by `InfrastructureErrorType` (§12.5), so
  callers can rely on the contract whichever driver runs
- a new interface → also export it from `src/application/interfaces/index.ts`

**Reference:** `src/application/interfaces/infrastructure/storage.interface.ts`,
`src/application/interfaces/infrastructure/core/base-infrastructure-service.interface.ts`

### 2. Read env vars in the driver's config file

**Expands:** `CLAUDE.md` §11.1 (step 2)
**Rule:** Each driver has a `{driver}.config.ts` next to it: an interface extending `IDriverConfig` and a function
that reads the env vars, applies defaults and returns it. Validate the values there. The factory reads only
`{NAME}_DRIVER`, and `src/app/core/config/` holds application config only (`app.config.ts`, `server.config.ts`,
`config.ts`, `load-env.ts`), never a service's.
**Why:** The config travels with the driver it configures, so adding or removing a driver touches one folder. A bad
value fails startup with a message that names it, instead of failing at the first request.

```typescript
export interface IMongooseConfig extends IDriverConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export const mongooseConfig = (): IMongooseConfig => ({
  driverName: 'mongoose',
  singleton: true,
  deferred: true,
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite-node-application',
  options: {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 15000,
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
    autoIndex: process.env.MONGODB_AUTO_INDEX !== 'false',
  },
});
```

**Use cases:**

- a number with a default → `Number(x) || 15000`; when `0` is a valid value, test whether the variable is set instead
  (`HTTP_CLIENT_CIRCUIT_FAILURE_THRESHOLD` in `http-client-service.factory.ts`)
- an invalid or missing required value → throw `RangeError` from the config function (`email-queue.config.ts`;
  `ses.config.ts` without `EMAIL_FROM`)
- circuit breaker settings → a `circuitBreaker: { failureThreshold, resetTimeout }` field, spread into the
  `CircuitBreaker` by the factory (card 10)
- credentials for AWS → never in env config; the SDK's default provider chain supplies them
  (`Docs/features/email.md` card 9)
- every new variable → documented in `.env.example`, in the service's section
- a service without a driver → reads its config in its own constructor (`LocalStorageService` → `storageConfig()`);
  the HTTP client reads its three settings in its factory

**Reference:** `src/infrastructure/persistance/database/service/database-mapper/driver/mongoose.config.ts`,
`src/infrastructure/email/smtp/driver/smtp.config.ts`

### 3. Wrap the client in a driver and build it with a loader

**Expands:** `CLAUDE.md` §11.1 (steps 3–4)
**Rule:** A driver implements `ICoreDriver<Client, Config>`:

- `init()` connects, and throws `DriverError` when it can't;
- `client()` returns the library client;
- `shutdown()` closes it;
- `health()` probes the remote end, for a remote dependency.

A driver loader builds and initializes the driver for the factory. A driver is never registered in DI: only the
service that owns it sees it.
**Why:** The service receives a client that is already connected, so it has no "not connected yet" state, and each
technology's connection handling lives in one class.

```typescript
export class MongooseDriver implements ICoreDriver<typeof mongoose, IMongooseConfig> {
  // ...
  async init(): Promise<void> {
    try {
      const conn = await mongoose.connect(this._config.uri, this._config.options);
      this._client = conn;
    } catch (error: unknown) {
      throw new DriverError(
        `Failed to initialize MongooseDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
  // config(), client(), shutdown(), health()
}

export const mongooseDriverLoader = async (): Promise<MongooseDriver> => {
  const driver = new MongooseDriver(mongooseConfig());
  await driver.init();
  return driver;
};
```

**Use cases:**

- `health()` → returns `{ connected, latency?, error? }` and never throws: a failed probe is `connected: false`
  (card 11)
- a `DriverError` → extends `Error`, not `InfrastructureError`; thrown at startup, it ends the process with exit
  code 1
- the service constructor → guard the client with `if (!client)` and throw the service's own error
  (`MongooseService` → `PersistanceError`), never `instanceof Object` (§11.3)
- nothing to connect → no driver: `LocalStorageService.getDriver()` returns `null`, `HTTPClientService.getDriver()`
  returns axios
- a placeholder that sends nothing (in-memory push) → still a driver, so the factory keeps the same shape for every
  implementation

**Reference:** `src/infrastructure/persistance/database/service/database-mapper/driver/mongoose.driver.ts`,
`mongoose.driver.loader.ts` next to it

## Building and registering

### 4. Pick the implementation in the factory

**Expands:** `CLAUDE.md` §11.1 (step 6)
**Rule:** `{name}-service.factory.ts` implements `IServiceFactory<YourInterface>`:

- `name()` returns the same literal as the service's `serviceName()`;
- `create()` switches on `process.env.{NAME}_DRIVER` (with a default), builds the driver through its loader and
  returns the service;
- an unsupported value, or a driver that is planned but not built, throws `InfrastructureError` `DRIVER_ERROR`.

**Why:** The factory is the only place that knows which implementations exist, so switching provider is a config
change. A misspelt driver name fails startup instead of silently running another one.

```typescript
export class StorageServiceFactory implements IServiceFactory<IStorage> {
  name(): 'storage' {
    return 'storage';
  }

  async create(): Promise<IStorage> {
    const driver = process.env.STORAGE_DRIVER || 'filesystem';
    switch (driver) {
      case 'filesystem':
        return new LocalStorageService();
      case 'aws':
        throw new InfrastructureError('AWS S3 storage service not yet implemented', 'DRIVER_ERROR', {
          provider: 'aws',
        });
      // 'gcp', 'azure': the same
      default:
        throw new InfrastructureError(`Unsupported storage driver: ${driver}`, 'DRIVER_ERROR', {
          driver,
        });
    }
  }
}
```

**Use cases:**

- `IServiceFactory<T>` types `name()` as `ReturnType<T['serviceName']>` → the compiler rejects a `name()` that
  differs from the interface's literal
- case-insensitive values → lowercase before the `switch` (`EMAIL_DRIVER`, `QUEUE_DRIVER`,
  `PUSH_NOTIFICATION_DRIVER`); an alias → an extra `case` (`inmemory` / `in-memory`)
- a planned driver → keep a `case` that throws `DRIVER_ERROR` "not yet implemented", so the value is reserved and the
  message says why
- `create()` throws → the error leaves `InfrastructureManager.init()` and the process exits with code 1
- the service needs other infrastructure services → return a closure (card 5)

**Reference:** `src/infrastructure/storage/storage-service.factory.ts`; two drivers:
`src/infrastructure/email/email-service.factory.ts`

### 5. Inject other infrastructure services through a synchronous closure

**Expands:** `CLAUDE.md` §11.2
**Rule:** A factory whose service needs other infrastructure services does its async setup (driver loader, circuit
breaker) in `create()`, then returns a `ServiceClosure<T>`: a synchronous function whose parameter names are the
registration names of the services it needs.
**Why:** The manager registers every factory's result before resolving any, so the dependencies can come from
anywhere in the loader. Awilix registers whatever the closure returns, so an `async` closure would hand every
consumer a Promise.

```typescript
async createSMTPEmailService(): Promise<ServiceClosure<IEmailService>> {
  const driver = await smtpDriverLoader();
  const circuitBreaker = new CircuitBreaker({
    name: 'smtp',
    ...driver.config().circuitBreaker,
    isFailure: isSmtpOutage,
  });
  return (queue: IQueue, logger: ILogger): IEmailService =>
    new SMTPEmailService(driver, circuitBreaker, queue, new EmailLoggerService(), logger);
}
```

**Use cases:**

- a parameter that matches no registration, or a cycle → `InfrastructureError` `DRIVER_ERROR`
  `Infrastructure service 'emailService' could not be resolved: …`, with the Awilix error in `data.cause`
- the worker and the seeder don't build `socket` (card 6) → never take `socket` in a service the worker needs
- a helper that is not an infrastructure service (`EmailLoggerService`) → build it inside the closure with `new`; it
  is not in DI
- the closure runs once → the manager registers it as a singleton

**Reference:** `src/infrastructure/email/email-service.factory.ts`; `closureResolver()` in
`src/infrastructure/infrastructure.manager.ts`

### 6. Add the factory to the loader, in any position

**Expands:** `CLAUDE.md` §11.1 (steps 7–8)
**Rule:** Export the factory from `src/infrastructure/{name}/index.ts` and add its class to `infrastructureLoader`.
Change nothing else: `app.ts`, `worker.ts` and `InfrastructureManager` don't list services.
**Why:** Every result is registered before any is resolved (card 7), so the position in the list never matters.

```typescript
export const infrastructureLoader: InfrastructureFactoryClass[] = [
  CacheServiceFactory,
  EmailServiceFactory,
  LoggerServiceFactory,
  PushNotificationServiceFactory,
  DatabaseMapperServiceFactory,
  QueueServiceFactory,
  SocketServiceFactory,
  StorageServiceFactory,
  HTTPClientServiceFactory,
];
```

**Use cases:**

- a service the worker process must not build → filter its factory class out in `initForWorker()`, as `socket` is
  (it needs the API's HTTP server)
- other infrastructure code imports the service → export it from the `src/infrastructure/index.ts` barrel too

**Reference:** `src/infrastructure/infrastructure.loader.ts`

### 7. Let `InfrastructureManager` build every service

**Expands:** `CLAUDE.md` §11.1 (Why)
**Rule:** Never construct an infrastructure service yourself. `InfrastructureManager.init()` (API) or
`initForWorker()` (worker, seeder) builds them all, and code receives them by injection.
**Why:** Only the manager checks each service, registers it with the health check and tracks it for shutdown. A
service built anywhere else is never checked, never health-checked and never closed.

```typescript
for (const factory of factories) {
  const created = await factory.create(); // 1. Register
  if (typeof created === 'function') {
    container.register({ [factory.name()]: this.closureResolver(created, built) });
  } else {
    built.push(created);
    container.register({ [factory.name()]: asValue(created) });
  }
}
for (const factory of factories) {
  this.assertService(this.resolveService(container, factory.name()), factory.name()); // 2. Resolve and check
}
for (const service of built) {
  this.services.push(service); // 3. Track: shutdown list and health check
  await this.serviceCreated(service, onServiceCreated);
}
```

1. **Register:** runs each factory's `create()` in loader order. A service is registered with `asValue` and added to
   `built` at once. A closure is registered as a singleton resolver that adds the service to `built` when Awilix
   builds it.
2. **Resolve:** resolves every name. Building a closure resolves its parameters first, so `built` ends up with
   dependencies before their dependents. Each of these is `InfrastructureError` `DRIVER_ERROR` (`deferred()` is not
   checked):
   - a name Awilix can't resolve;
   - a `serviceName()` that differs from the factory's `name()`;
   - `singleton()` returning `false`.
3. **Track:** only once every service has resolved, adds each one, in `built` order, to the shutdown list and the
   health check, and calls the optional `onServiceCreated(service)`. Then it registers `healthCheck`.

**Use cases:**

- the API → `init(container)`; the worker and the seeder → `initForWorker(container)`, which leaves out `socket`
- application components → auto-registered only after the manager has finished
  (`autoRegisterApplicationComponents()`), so every repository and service finds its infrastructure dependencies
- any phase fails → the process exits with code 1 (see Known gaps for drivers left open)
- callers → hold the manager through `IInfrastructureManager`
  (`src/application/interfaces/infrastructure/infrastructure-manager.interface.ts`)

**Reference:** `src/infrastructure/infrastructure.manager.ts`, `src/infrastructure/infrastructure.manager.spec.ts`

### 8. Implement `shutdown()` when the service holds a connection

**Expands:** `CLAUDE.md` §11.1 (Why: "shut down in reverse build order")
**Rule:** A service that holds connections, timers or buffers implements `shutdown()` and closes them, usually
through its driver. A failure throws the service's own error.
**Why:** `InfrastructureManager.shutdown()` walks the services in reverse build order, so a dependent (`emailService`)
closes before its dependencies (`queue`, `logger`). It logs a failed `shutdown()` and goes on with the next service,
so one failure doesn't leave the others open.

**Use cases:**

- the order across the process → `ShutdownManager` hooks, lowest priority first; hooks of one priority run in
  parallel; 15 s global timeout:

  | Process | Hooks                                                                                            |
  | ------- | ------------------------------------------------------------------------------------------------ |
  | API     | `http-server` (CRITICAL, 5 s) → `infrastructure-services` (MEDIUM, 8 s) → `telemetry` (LOW, 2 s) |
  | Worker  | `workers` (HIGH, 10 s) → `infrastructure-services` (MEDIUM, 8 s) → `telemetry` (LOW, 2 s)        |

- every service's `shutdown()` together → must fit the 8 s `infrastructure-services` hook
- queue workers → closed in the `workers` hook, while Redis and the database are still connected (card 12)
- the services with a `shutdown()` today → `database_mapper`, `cache`, `queue`, `logger`, `socket`, and
  `pushNotification` with the SNS driver

**Reference:** `shutdown()` in `src/infrastructure/infrastructure.manager.ts`; `registerShutdownHooks()` in
`src/app/app.ts` and `src/app/worker.ts`

## Failure handling

### 9. Wrap only the driver's own failures

**Expands:** `CLAUDE.md` §11.3
**Rule:** Keep the `try` around the driver call alone. Turn what the driver throws into your `InfrastructureError`
subclass (or `InfrastructureError` with the service's type), with a message for the logs and the original in
`data.cause`. Let everything else pass unchanged: caller input, caller callbacks and programming errors.
**Why:** An `InfrastructureError` becomes a generic 500 / 503 and reads as an outage. A caller's mistake relabelled
`CACHE_ERROR` hides the bug. A raw driver error that escapes untranslated reaches the controller as an unknown 500,
without its type.

```typescript
// ✅ RedisCacheService.set(): an unserializable value is the caller's error, so it is serialized before the try
const serializedValue = JSON.stringify(value);
try {
  if (ttl) {
    await this.redisClient.setEx(key, ttl, serializedValue);
  } else {
    await this.redisClient.set(key, serializedValue);
  }
} catch (e: unknown) {
  throw new InfrastructureError(
    `Failed to set cache key "${key}": ${e instanceof Error ? e.message : 'Unknown error'}`,
    'CACHE_ERROR',
    { key, cause: e },
  );
}

// ❌ JSON.stringify() inside the try: a circular value becomes a CACHE_ERROR, a 500 that blames Redis
```

**Use cases:**

- a caller's callback must run inside the `try` (a transaction) → rethrow whatever is not the library's own error.
  `MongooseService.transaction()` checks `isMongooseDriverError()`, and translates only after `withTransaction` has
  finished retrying (§8.3). A library without a common error class (node-redis, BullMQ) → keep the `try` narrow
  instead
- an error object that carries secrets → copy only what is safe. The HTTP client keeps `{ method, url, code, error }`
  and drops the `AxiosError`, whose `config` holds the request headers. SES and SNS keep a sanitized copy (name,
  message, stack) in `data.cause`
- the type → the one the caller can act on: `CONNECTION_ERROR` / `NETWORK_ERROR` when the dependency can't be reached
  (503), the service's own type otherwise (500); see `CLAUDE.md` §10
- the message → for the logs only; `catchExceptionsWrapper()` answers with a generic message (§9.4)
- a driver's `init()` → `DriverError` (card 3)

The error classes:

| Class                   | Type                          | Thrown by                                                                                                                                                      |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InfrastructureError`   | Any `InfrastructureErrorType` | Cache (`CACHE_ERROR`), storage (`STORAGE_ERROR`), HTTP client (`NETWORK_ERROR`), factories and the manager (`DRIVER_ERROR`), the database (`CONNECTION_ERROR`) |
| `PersistanceError`      | `DATABASE_ERROR`              | `MongooseService`, `BaseRepository`, mappers                                                                                                                   |
| `QueueError`            | `QUEUE_ERROR`                 | `BullMQQueueService`                                                                                                                                           |
| `SocketError`           | `SOCKET_ERROR`                | `SocketIOService`                                                                                                                                              |
| `SmtpError`, `SesError` | `EMAIL_ERROR`                 | The SMTP and SES email services                                                                                                                                |
| `SnsError`              | `NOTIFICATION_ERROR`          | `SNSPushNotificationService`                                                                                                                                   |
| `CircuitOpenError`      | `CONNECTION_ERROR`            | `CircuitBreaker.execute()` (card 10)                                                                                                                           |
| `DriverError`           | — (extends `Error`)           | Drivers' `init()` and `shutdown()`                                                                                                                             |

`RepositoryError` (`DUPLICATE_KEY`, `INVALID_ID`, `VERSION_CONFLICT`) is rejected caller data, not an
infrastructure failure, and does not extend `InfrastructureError` (`CLAUDE.md` §6.5).

**Reference:** `src/infrastructure/cache/redis/redis-cache.service.ts`,
`src/infrastructure/persistance/database/service/database-mapper/mongoose.service.ts`,
`src/infrastructure/http/http-client.service.ts`

### 10. Put a circuit breaker in front of remote dependencies that aren't retried

**Expands:** `CLAUDE.md` §11.4
**Rule:** Build a `CircuitBreaker` in the factory from the driver config's `failureThreshold` / `resetTimeout`, and
inject it as `ICircuitBreaker`. Wrap the driver call **and** its error translation in `execute()`. The call must have
a timeout of its own.
**Why:** While a dependency keeps failing, the breaker rejects calls at once with `CircuitOpenError` (a
`CONNECTION_ERROR`, so a generic 503) instead of holding every request for the full timeout.

```typescript
protected override async transport(message: IEmailMessage): Promise<void> {
  await this.circuitBreaker.execute(() =>
    this.transporter
      .sendMail({ from: this.driver.config().from, to: message.to, subject: message.subject, html: message.body })
      .catch((error: unknown) => {
        throw new SmtpError(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          code: error instanceof Error && 'code' in error ? error.code : undefined,
          cause: error,
        });
      }),
  );
}
```

How the breaker moves:

- **closed** → each counted failure adds one and each success takes one off; the breaker opens when the count exceeds
  `failureThreshold`
- **open** → `execute()` throws `CircuitOpenError` without calling; after `resetTimeout` ms it turns half-open (the
  timer is `unref()`'d, so it never holds the process open)
- **half-open** → one probe call goes through and other calls are rejected; a success closes the breaker, a failure
  reopens it

**Use cases:**

- which dependencies → SMTP, SES, SNS and third-party HTTP hosts: yes. MongoDB (its timeouts bound each request),
  Redis (`disableOfflineQueue` already fails fast), the logger and local storage: no
- what counts → by default any `InfrastructureError` (`isFailure`). An error that rejects one request, not the
  server, must not count: pass `isSmtpOutage()` (ignores `EENVELOPE` / `EMESSAGE`), `isSesOutage()` or
  `isSnsOutage()` (ignore client faults). An error `isFailure` rejects leaves the breaker untouched
- a failure that comes back as a value → pass `isFailureResult` to `execute()`; the HTTP client counts 5xx, 408 and
  429 responses
- translate inside `execute()` → so `isFailure` sees your error type, not the raw library error
- invalid options → `RangeError` from the constructor, so build breakers in the factory, at startup
- one breaker per call target → inject a function that creates one (`createCircuitBreaker(origin)`), and call it once
  at startup (`'startup-check'`) so invalid options still fail there. The HTTP client keeps one per origin, at most
  100, dropping the least recently used; a URL it can't parse gets none
- reporting → implement `circuitBreakerStatuses()` (card 11); with one breaker per target, return only those that
  are not closed

**Reference:** `src/infrastructure/core/circuit-breaker/circuit-breaker.ts`,
`src/infrastructure/email/email-service.factory.ts`, `src/infrastructure/email/smtp/smtp-email.service.ts`

### 11. Report health through the driver

**Expands:** `CLAUDE.md` §11.4 (the `/health` use case)
**Rule:** Give every driver of a remote dependency a `health()` bounded by the driver's own timeouts; the health check
calls it through `service.getDriver()`, bypassing the breaker. Breaker state is reported next to it and never changes
a service's status.
**Why:** Health must show whether the dependency answers now. A breaker can be open while the dependency has already
recovered.

How `/health` is computed:

- per service → the driver's `health()` gives `connected` / `disconnected`, `latency` and `message`. Without
  `health()`, a truthy `getDriver()` counts as `connected` and a falsy one as `disconnected` ("Driver not
  initialized"); a throw counts as `disconnected`
- overall → `unhealthy` when the database is disconnected, `degraded` when any other service is, otherwise `healthy`
- the response → `/health` and `/health/ready` answer 200 only when `healthy`, otherwise 503; `/health/live` always
  answers 200 and checks nothing

**Use cases:**

- service keys → shown with friendly names (`database_mapper` → `database`, `emailService` → `email`,
  `pushNotification` → `push_notification`); an unmapped token appears as is (`httpClient`). Add a mapping for a new
  token that doesn't read well
- `circuitBreakerStatuses()` → shown as the service's `circuit_breakers`
- the public response → keeps each service's `status`, `latency` and breakers' state and counts. It drops `message`
  and breaker names, which the controller logs, so `health()` messages may name hosts but must never hold secrets
- a service with no driver → reported `disconnected` (see Known gaps)

**Reference:** `src/infrastructure/health/infrastructure-health-check.service.ts`,
`src/presentation/http/controllers/health/health.controller.ts`

## Service contracts

### 12. Close every queue processor you start

**Expands:** `CLAUDE.md` §11.5
**Rule:** A queue worker (`src/application/workers/{feature}/{name}.worker.ts`) implements `IWorker` (`workerName()`,
`init()`, `shutdown()`) and ends with `export default ClassName;`. For every `queue.processJobs(queueName, processor)`
it starts, it calls `queue.closeWorkers(queueName)`: in `shutdown()`, or as soon as a processor that runs for a limited
time is done.
**Why:** Each processor is a BullMQ worker with its own Redis connection. Until it is closed it keeps polling and
taking jobs, and the queue service keeps a reference to it, so its connection and memory are never freed.

```typescript
export class EmailWorker implements IWorker {
  constructor(
    private readonly queue: IQueue,
    private readonly emailService: IEmailService,
  ) {}

  workerName(): string {
    return 'email';
  }

  async init(): Promise<void> {
    await this.queue.processJobs<IEmailJobData>(this.emailService.emailQueueName(), (job) =>
      this.emailService.deliverQueuedEmail(job),
    );
  }

  async shutdown(): Promise<void> {
    await this.queue.closeWorkers(this.emailService.emailQueueName());
  }
}

export default EmailWorker;
```

**Use cases:**

- how workers start → `InfiniteNodeWorker` resolves every registration whose name ends in `Worker` and that has the
  `IWorker` methods, then awaits each `init()` in turn
- `closeWorkers()` waits for the jobs in flight and has no timeout of its own → keep jobs shorter than the 10 s
  `workers` hook
- it closes every worker on that queue → never call it for a queue another component still processes
- a worker sees only `IQueue` → never close a BullMQ `Worker` directly
- a worker that fails to close → `QueueError` once the other workers on the queue are closed; `InfiniteNodeWorker`
  logs it and still shuts down the other workers
- a processor that fails to start → `processJobs()` force-closes it and throws `QueueError`; there is nothing to pass
  to `closeWorkers()`

**Reference:** `src/application/workers/email/email.worker.ts`,
`src/infrastructure/queue/bullmq/bullmq-queue.service.ts`

### 13. Call external HTTP APIs through `httpClient`

**Expands:** `CLAUDE.md` §11.6
**Rule:** Inject `httpClient` (`IHTTPClient`) and check each response's status: a non-2xx response does not throw.
Each request method takes an `Omit<RequestConfig, 'method'>`.
**Why:** One client gives every outbound call the same timeout, error translation and per-host circuit breaker, and
keeps request headers out of the logs.

```typescript
export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: Record<string, unknown> | Record<string, unknown>[] | undefined;
  timeout?: number;
};
```

**Use cases:**

- a request that was sent but failed (DNS, refused, timeout, redirects, unreadable response) → `InfrastructureError`
  `NETWORK_ERROR` with `data: { method, url, code, error }`, never the request headers
- a request that can't be set up (invalid URL, unserializable body) → the original error, unchanged
- a failing host → its breaker opens (card 10) and requests to it throw `CircuitOpenError` unsent; other hosts are
  unaffected
- a batch body → `data` accepts an array of objects. Keep the explicit `| undefined`: the project compiles with
  `exactOptionalPropertyTypes`. `GET` / `DELETE` ignore `data`
- the request shape → `RequestConfig` is its only definition; `HTTPClientService.createRequest()` takes it too, so
  never redeclare it inline
- settings → `HTTP_CLIENT_TIMEOUT` (5000 ms), `HTTP_CLIENT_CIRCUIT_FAILURE_THRESHOLD` (5),
  `HTTP_CLIENT_CIRCUIT_RESET_TIMEOUT` (30000 ms)

**Reference:** `src/application/interfaces/infrastructure/http-client.interface.ts`,
`src/infrastructure/http/http-client.service.ts`

## Changing and testing

### 14. Add a driver without touching the inner layers

**Rule:** A new provider for an existing service is a new driver folder plus one `case` in its factory. The
interface, the DI token and every caller stay as they are.
**Why:** Callers depend on the interface only (card 1), so they can't tell which driver runs.

For example, S3 storage (illustrative; nothing below exists yet):

1. `src/infrastructure/storage/s3/driver/`: `s3.config.ts` (card 2), `s3.driver.ts` implementing
   `ICoreDriver<S3Client, IS3Config>` with a `health()`, and `s3.driver.loader.ts` (card 3).
2. `src/infrastructure/storage/s3/s3-storage.service.ts` implementing `IStorage` with the same semantics: `null` /
   `[]` for missing paths, `STORAGE_ERROR` for failures (card 9), behind a breaker (card 10).
3. In `StorageServiceFactory.create()`, replace the `'aws'` case's "not yet implemented" throw with the new service.
4. Document `STORAGE_DRIVER=aws` and the new variables in `.env.example`; add specs (card 15).

**Use cases:**

- the new provider can't honour the contract → change the interface first, for every driver, and list it as a
  breaking change (§13.3)
- a feature only one provider has → don't widen the shared interface for it without agreeing it first

### 15. Test against the interface

**Rule:** Unit-test inner layers against a plain object that implements the interface with `jest.fn()`. Test each
infrastructure class in its own spec next to it.
**Why:** The interface is the whole contract, so a test that satisfies it needs no Redis, MongoDB or SMTP server.

```typescript
emailService = {
  serviceName: jest.fn(() => 'emailService' as const),
  singleton: jest.fn(() => true as const),
  deferred: jest.fn(() => false as const),
  getDriver: jest.fn(),
  sendEmail: jest.fn(),
  emailQueueName: jest.fn(),
  enqueueEmail: jest.fn(),
  deliverQueuedEmail: jest.fn(),
};
```

**Use cases:**

- a factory → one test per driver value, plus the `DRIVER_ERROR` default
  (`push-notification-service.factory.spec.ts`, `email-service.factory.spec.ts`)
- a service → mock the client and assert the translation, including that errors which are not the driver's pass
  through unchanged (`redis-cache.service.spec.ts`, `http-client.service.spec.ts`)
- the manager and the breaker → `infrastructure.manager.spec.ts`, `circuit-breaker.spec.ts`
- a test against a real database → its own database name in `connectToTestDB()` (§6.7)

**Reference:** `src/application/services/auth/account-recovery.application.service.spec.ts`

## Checklist: a new infrastructure service

```
☐ 1  Interface extending IBaseInfrastructureService: literal serviceName(), singleton(): true, deferred(): false,
     @throws by error type; exported from application/interfaces/index.ts (card 1)
☐ 2  {driver}.config.ts extending IDriverConfig; env vars read and validated there; .env.example updated (card 2)
☐ 3  Driver implementing ICoreDriver (health() for a remote dependency) and its loader (card 3)
☐ 4  Service implementing the interface: try only around driver calls; shutdown() if it holds connections (cards 8, 9)
☐ 5  A circuit breaker built in the factory, for a remote dependency that isn't retried (card 10)
☐ 6  Factory: name() === serviceName(); switch on {NAME}_DRIVER; DRIVER_ERROR default; closure if it needs other
     services (cards 4, 5)
☐ 7  Exported from src/infrastructure/{name}/index.ts and added to infrastructureLoader (card 6)
☐ 8  A friendly name in the health check, if the token doesn't read well (card 11)
☐ 9  Specs for the driver, the service and the factory (card 15)
☐ 10 The CLAUDE.md §11 table and this file's Services table; JSDoc (§12.5) and the §13.2 checks
```

## Known gaps

Code that does not follow the cards above yet:

- `SocketServiceFactory` throws `SOCKET_ERROR` for an unsupported `SOCKET_DRIVER`, not `DRIVER_ERROR`
  (`src/infrastructure/socket/socket-service.factory.ts`).
- `HTTPClientServiceFactory` has no `{NAME}_DRIVER` switch: axios is the only implementation.
- Nothing reads `IDriverConfig.singleton`, `deferred` or `optional`, so the `*_SERVICE_OPTIONAL` variables have no
  effect. `storageConfig()` returns `singleton: false, deferred: true`, the opposite of `LocalStorageService`.
- The SMTP and SES drivers' `shutdown()` is never called: `BaseEmailService` has no `shutdown()`.
- When a factory's `create()` throws, the drivers that earlier factories already connected are not closed: services
  join the shutdown list only in the manager's third phase.
- With the default drivers, storage (`getDriver()` returns `null`) and in-memory push (its driver's `client()` is
  `undefined`) are reported `disconnected`. The overall status is therefore `degraded`, and `/health` and
  `/health/ready` answer 503. Found by reading the code, not reproduced.
- `IDatabase` (`src/application/interfaces/infrastructure/db.interface.ts`) has no implementation.
- No service implements `isShuttingDown()`.
- `MongooseService.shutdown()` throws `PersistanceError` without the original error as its cause.
