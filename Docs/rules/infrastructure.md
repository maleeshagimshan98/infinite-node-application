# Infrastructure service rules (§11)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

---

## 11. Infrastructure services

| Token              | Interface                  | Service                                                                                           |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------- |
| `database_mapper`  | `IDatabaseMapper`          | MongoDB via Mongoose; transactions (§8)                                                           |
| `cache`            | `ICache`                   | Redis                                                                                             |
| `logger`           | `ILogger`                  | Winston (+ OpenTelemetry log export)                                                              |
| `queue`            | `IQueue`                   | BullMQ (§11.5)                                                                                    |
| `emailService`     | `IEmailService`            | SMTP or AWS SES, behind a circuit breaker (`Docs/features/email.md`)                              |
| `storage`          | `IStorage`                 | Local file storage; `readFile()` returns `null` and `listFiles()` returns `[]` for a missing path |
| `pushNotification` | `IPushNotificationService` | In-memory placeholder or AWS SNS push (`Docs/features/notification.md`)                           |
| `socket`           | `ISocket`                  | Socket.IO (API process only)                                                                      |
| `httpClient`       | `IHTTPClient`              | Axios, one circuit breaker per host (§11.6)                                                       |

### 11.1 Add a service with the driver → service → factory pattern

**Rule:** A new infrastructure service takes these files, and nothing else changes:

1. Interface: `src/application/interfaces/infrastructure/{name}.interface.ts`, extending `IBaseInfrastructureService`
   with a literal `serviceName()`
2. Config: `src/infrastructure/{name}/driver/{driver}.config.ts`, extending `IDriverConfig` and reading env vars
3. Driver: `{driver}.driver.ts`, implementing `ICoreDriver<Client, Config>`
4. Driver loader: `{driver}.driver.loader.ts`
5. Service: `src/infrastructure/{name}/{name}.service.ts`, implementing your interface
6. Factory: `{name}-service.factory.ts`, implementing `IServiceFactory<YourInterface>`, switching on
   `process.env.{NAME}_DRIVER`; `name()` returns the same literal as the service's `serviceName()`
7. Export from `src/infrastructure/{name}/index.ts`
8. Add the factory to `src/infrastructure/infrastructure.loader.ts` (any position)

**Why:** `InfrastructureManager.init()` registers every service under its factory's `name()` before resolving any, so
the order doesn't matter. Resolved services join the health check and shut down in reverse build order.
**Use cases:**

- an unsupported `{NAME}_DRIVER` value, a missing or cyclic dependency, `serviceName()` ≠ `name()`, or
  `singleton()` returning `false` → startup fails with `InfrastructureError` `DRIVER_ERROR`
- the worker and the seeder use `initForWorker()`, which leaves out `socket`

**Reference:** `src/infrastructure/email/` (two drivers); details: `Docs/architecture/infrastructure-layer-pattern.md`

### 11.2 Inject other infrastructure services through a synchronous closure

**Rule:** A factory whose service needs other infrastructure services returns a `ServiceClosure<T>` from `create()`.
Each closure parameter is named after a registration name; do async setup before returning it.
**Why:** Awilix registers whatever the closure returns, so an `async` closure would hand every consumer a Promise.

```typescript
async createSMTPEmailService(): Promise<ServiceClosure<IEmailService>> {
  const driver = await smtpDriverLoader();
  const circuitBreaker = new CircuitBreaker({ name: 'smtp', ...driver.config().circuitBreaker, isFailure: isSmtpOutage });
  return (queue: IQueue, logger: ILogger): IEmailService =>
    new SMTPEmailService(driver, circuitBreaker, queue, new EmailLoggerService(), logger);
}
```

**Reference:** `src/infrastructure/email/email-service.factory.ts`

### 11.3 Wrap only the driver's own failures

**Rule:** An infrastructure error type means "this infrastructure failed", nothing else. Keep the `try` around the
driver call only, throw your `InfrastructureError` subclass `(message, data?, options?)` with the original in
`data.cause`, and let every other error pass unchanged.
**Why:** A caller's mistake relabelled as `CACHE_ERROR` / `QUEUE_ERROR` becomes a generic 500 and hides the bug.
**Use cases:**

- caller input (serializing a value, validating) → do it before the `try` (see `RedisCacheService.set()`)
- a caller callback that must run inside the `try` (a transaction) → rethrow anything that is not the library's own
  error class (`isMongooseDriverError()` in `src/infrastructure/persistance/database/errors/mongoose-error.guards.ts`);
  if the library has no common base class (node-redis, BullMQ), keep the `try` narrow instead
- an error object carrying secrets (an `AxiosError` holds the request headers) → copy only its `code` and `message`
- "not found" when the contract can say so → return `null` / `[]`, don't throw
- a driver → throws `DriverError(message, cause?)`
- the service constructor → guard the client with `if (!client)` only, never `instanceof Object`
- the shape of the `catch` → see the ✅ example in §12.6

### 11.4 Put a circuit breaker in front of remote dependencies that aren't retried

**Rule:** Build a `CircuitBreaker` (`src/infrastructure/core/circuit-breaker/circuit-breaker.ts`) in the factory, from
the driver config's `failureThreshold` / `resetTimeout`, and inject it as `ICircuitBreaker`. Wrap the driver call
**and** its error translation in `execute()`. The protected call must have a timeout.
**Why:** It rejects calls with `CircuitOpenError` (a `CONNECTION_ERROR`, so a generic 503) while a dependency keeps
failing, instead of holding every request for the full timeout.
**Use cases:**

- SMTP, SES, SNS, third-party HTTP → yes; MongoDB (its timeouts already bound each request), Redis
  (`disableOfflineQueue` already fails fast), the logger and local storage → no
- some errors reject one request rather than signal an outage → pass `isFailure` (e.g. `isSmtpOutage()`,
  `isSesOutage()`); count a returned value → pass `isFailureResult` to `execute()` (the HTTP client counts 5xx /
  408 / 429)
- one breaker per call target (HTTP hosts) → inject a function that creates one, and build one at startup so invalid
  options fail there
- `/health` → health checks call `getDriver().health()` and bypass the breaker; implement
  `IBaseInfrastructureService.circuitBreakerStatuses()` to report breakers as `circuit_breakers` (only the
  non-closed ones when there is one per call target). Breaker state never changes the service's health status, and
  the public response drops the breaker names (the controller logs them)

### 11.5 Close every queue processor you start

**Rule:** A queue worker (`src/application/workers/{feature}/{name}.worker.ts`) implements `IWorker` (`workerName()`,
`init()`, `shutdown()`). For every `queue.processJobs(queueName, processor)` it starts, it calls
`queue.closeWorkers(queueName)`: in `shutdown()`, or as soon as a processor that runs for a limited time is done.
**Why:** Each processor is a BullMQ worker with its own Redis connection that keeps polling and taking jobs until it
is closed.
**Use cases:**

- `closeWorkers()` waits for the jobs in flight and has no timeout of its own → keep jobs shorter than the `workers`
  shutdown hook (10 s)
- it closes every worker on that queue → never call it for a queue another component still processes; never close a
  BullMQ `Worker` directly
- a processor that fails to start → `processJobs()` already closed it and throws `QueueError`
- shutdown order → `InfiniteNodeWorker` calls every worker's `shutdown()` before the infrastructure disconnects

**Reference:** `src/application/workers/email/email.worker.ts`

### 11.6 Call external HTTP APIs through `httpClient`

**Rule:** Inject `httpClient` (`IHTTPClient`) and check each response's status: a non-2xx response does not throw.
Each request method takes an `Omit<RequestConfig, 'method'>`.
**Use cases:**

- a request that was sent but failed (DNS, refused, timeout, redirects, unreadable response) → `InfrastructureError`
  `NETWORK_ERROR` with `data: { method, url, code, error }`, never request headers
- a request that can't be set up (invalid URL, unserializable body) → the original error, unchanged
- a failing host → its own circuit breaker opens (network errors and 5xx / 408 / 429 count) and requests to it throw
  `CircuitOpenError` unsent; other hosts are unaffected; only the 100 most recently used hosts keep a breaker
- a batch body → `RequestConfig.data` is `Record<string, unknown> | Record<string, unknown>[] | undefined` (keep the
  `| undefined`); `GET` / `DELETE` ignore it
- settings → `HTTP_CLIENT_TIMEOUT` (5000 ms), `HTTP_CLIENT_CIRCUIT_FAILURE_THRESHOLD` (5),
  `HTTP_CLIENT_CIRCUIT_RESET_TIMEOUT` (30000 ms)

**Reference:** `src/infrastructure/http/`

### 11.7 Feature rules: email and notifications

- **Email** (`Docs/features/email.md`): send with `enqueueEmail(new NewEmail({ ..., status: 'pending' }))`; only the
  email infrastructure writes the email log; an email's body and `error_message` never leave the API.
  `EMAIL_DRIVER` is `smtp` (default) or `aws-ses`; anything else fails startup.
- **Push notifications** (`Docs/features/notification.md`): `PUSH_NOTIFICATION_DRIVER` is `inmemory` (default,
  sends nothing) or `aws-sns`. Queueing and logging belong to the planned notification manager (DI token
  `notification`); the notification log is built but nothing writes it yet.

### 11.8 Carry on when a cache that is only an optimisation fails

**Rule:** When the database stays the source of truth and the cache only speeds reads up, catch the
`InfrastructureError` a cache call throws, log it through `logger` and carry on (read from the database instead).
Rethrow every other error.
**Why:** A Redis outage then slows requests down instead of failing them, and a bug (an error that is not an
`InfrastructureError`) still surfaces.
**Use cases:**

- the catch → `if (!(e instanceof InfrastructureError)) throw e;`, then `this.logger.logError(…)`
- a feature that can't work without the cache → let the error propagate: `CACHE_ERROR` becomes a generic 500 (§10)

**Reference:** `src/application/services/auth/login.application.service.ts` (`cacheLoginRecord()`,
`evictCacheField()`)
