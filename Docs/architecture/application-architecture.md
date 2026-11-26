# Application architecture

How the parts of the application fit together: the layers and the direction of their imports, the two processes,
how each boots and stops, how a request and a queued job travel through the code, and how errors move between layers.

This file explains; it doesn't set rules. The rules are in `CLAUDE.md`, cited here by section (§). Where the two
disagree, `CLAUDE.md` wins. Infrastructure services in depth: `Docs/architecture/infrastructure-layer-pattern.md`.

## 1. The big picture

Two Node.js processes are built from the same code and image. The **API** serves HTTP; the **worker** runs the queue
jobs. They share MongoDB and Redis, and never call each other directly: the API hands work to the worker through a
BullMQ queue in Redis.

```
                 clients (HTTPS through a proxy / load balancer)
                                  │
                                  ▼
┌──────────────────────────────────────────┐        ┌──────────────────────────────────────────┐
│ API process          src/index.ts        │        │ Worker process       src/worker.ts       │
│ InfiniteNodeApplication                  │        │ InfiniteNodeWorker                       │
│  Express + Socket.IO on one HTTP server  │        │  no HTTP server, no socket               │
│  routes → controllers → services         │        │  queue workers → services                │
└─────────┬─────────────────┬──────────────┘        └──────┬───────────────────┬───────────────┘
          │                 │  enqueue job                 │  take job         │
          │                 └─────────────► Redis ◄────────┘                   │
          │                 cache, rate-limit store, BullMQ queues             │
          │                                                                    │
          └──────────────────────────► MongoDB ◄───────────────────────────────┘
                                   replica set rs0 (needed for transactions)

  outbound: SMTP or AWS SES (email, from the worker) · AWS SNS (push) · third-party HTTP APIs
  telemetry: OTLP traces and logs to a collector, when OTEL_SDK_DISABLED=false
```

## 2. Layers and the dependency rule

The code is split into four layers. Imports point inward (§2.1): the domain knows nothing of HTTP, Mongoose, Redis
or Express, and the infrastructure plugs in from the outside by implementing interfaces that the inner layers own.

```
   ┌─────────────────────────────────────────────────────┐
   │ presentation/http   routes, middleware, controllers │──┐
   └─────────────────────────────────────────────────────┘  │
   ┌─────────────────────────────────────────────────────┐  │
   │ application         services, workers, interfaces/  │◄─┤ imports point down
   └─────────────────────────────────────────────────────┘  │
   ┌─────────────────────────────────────────────────────┐  │
   │ domain              models, domain services         │◄─┘
   └─────────────────────────────────────────────────────┘
              ▲ implements application/interfaces/ (injected by DI)
   ┌─────────────────────────────────────────────────────┐
   │ infrastructure      repositories, drivers, services │
   └─────────────────────────────────────────────────────┘
```

| Layer          | Folder                  | Holds                                                                     | May import (§2.1)                                |
| -------------- | ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| Presentation   | `src/presentation/http` | Routes, middleware, validators, controllers                               | application, domain, `app/core`                  |
| Application    | `src/application`       | Application services (transactions), queue workers, every interface       | domain, application                              |
| Domain         | `src/domain`            | Models with their invariants, domain services with the business rules     | domain, `application/interfaces`                 |
| Infrastructure | `src/infrastructure`    | Repositories, schemas, mappers, drivers and services for external systems | infrastructure, `application/interfaces`, domain |

`src/application/interfaces/` holds every contract that crosses a layer: repository interfaces, infrastructure
service interfaces, the worker contract, and the error contracts `InfrastructureError` and `RepositoryError`. A
domain service asks for an `IRoleRepository` or an `ICache`; DI hands it the Mongoose or Redis implementation. That is
what lets the domain be unit-tested with plain mocks and an infrastructure technology be swapped without touching
business logic.

`src/app/` sits outside the four layers: it composes them (DI container, config, middleware, startup, shutdown,
telemetry).

## 3. Source tree

```
src/
├── index.ts                     # API entry point
├── worker.ts                    # Worker entry point
├── app/
│   ├── app.ts                   # InfiniteNodeApplication: Express, HTTP server, boot sequence, shutdown hooks
│   ├── worker.ts                # InfiniteNodeWorker: worker boot sequence, shutdown hooks
│   └── core/
│       ├── service.container.ts # The Awilix container and the auto-registration globs
│       ├── config/              # load-env.ts, app.config.ts, server.config.ts, config.ts (app-level only)
│       ├── telemetry/           # instrumentation.ts (OpenTelemetry NodeSDK), otel.config.ts
│       ├── middleware/          # The core middleware chain and the rate-limit store (Redis, with memory failover)
│       ├── shutdown/            # ShutdownManager, priorities, signal and process error handlers
│       ├── errors/              # Errors of the app shell (InfiniteNodeError, RequestValidationError, …)
│       └── utils/               # ApiResponseUtils, Paginator, AuthenticatedRequest, startup banner
├── presentation/http/
│   ├── routes/                  # One router per feature, mounted in routes/index.ts
│   ├── middleware/              # UserValidatorMiddleware, RequestValidatorMiddleware, PermissionMiddleware
│   ├── validators/{feature}/    # express-validator schemas
│   └── controllers/{feature}/   # BaseController and one controller per resource
├── application/
│   ├── interfaces/              # repositories/, infrastructure/, errors/, worker/, app/
│   ├── services/{feature}/      # Application services; base/ holds BaseApplicationService (dbTransaction())
│   └── workers/{feature}/       # Queue workers (worker process only)
├── domain/
│   ├── base/                    # DomainEntity, DomainEntityError, BaseDomainService, DomainServiceError
│   └── {feature}/               # auth, user, app/email, app/notification, health
│       ├── models/              # Domain models
│       └── service/             # Domain services
└── infrastructure/
    ├── core/                    # Driver, factory and circuit breaker contracts; DriverError, CircuitOpenError
    ├── persistance/database/    # Mongoose service, repositories/mongoose/{feature}/, seeders/, indexes/, errors/
    ├── cache/ email/ health/ http/ logger/ push-notification/ queue/ socket/ storage/
    ├── notification/            # notification-log/ (the notification log writer; not wired yet)
    ├── infrastructure.loader.ts
    └── infrastructure.manager.ts
```

## 4. How the DI container is composed

There is one Awilix container (`src/app/core/service.container.ts`) in `CLASSIC` mode: a constructor receives each
dependency by its **parameter name** (§4.2). Registrations come from three places:

| Source                      | Registered                                                                                                                                          | When                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| By hand                     | `httpServer`, `expressServer` (API only), `appMetadata`                                                                                             | Before infrastructure     |
| `InfrastructureManager`     | `database_mapper`, `cache`, `queue`, `logger`, `emailService`, `pushNotification`, `storage`, `httpClient`, `socket` (API only), then `healthCheck` | Boot, step 1              |
| Auto-registration (by glob) | Every default export in the files below, as a singleton                                                                                             | Once infrastructure is up |

| Glob (under `src/`, or `dist/` when compiled)                              | API | Worker |
| -------------------------------------------------------------------------- | --- | ------ |
| `application/services/**/*.service.{ts,js}`                                | ✅  | ✅     |
| `domain/**/service/*.service.{ts,js}`                                      | ✅  | ✅     |
| `infrastructure/persistance/database/repositories/**/*.repository.{ts,js}` | ✅  | ✅     |
| `presentation/http/controllers/**/*.controller.{ts,js}`                    | ✅  | —      |
| `application/workers/**/*.worker.{ts,js}`                                  | —   | ✅     |

The token is the camelCased **file name**: `signup.application.service.ts` → `signupApplicationService`. Because files
are named after their class (§12.4), this equals the camelCased class name. Two consequences:

- a class whose token equals an infrastructure token replaces that service (§4.3): never name a domain service file
  `email.service.ts`;
- a parameter name that matches no token fails when the class is resolved, not when it compiles.

How infrastructure services are built and registered: `Docs/architecture/infrastructure-layer-pattern.md` cards 4–7.

## 5. The API process

### Boot

`src/index.ts` keeps `load-env` and `telemetry/instrumentation` as its first two imports: OpenTelemetry instruments
only the libraries loaded after it.

1. **`load-env`** sets `NODE_ENV` (default `development`) and, outside production, loads `.env.${NODE_ENV}`. In
   production the launcher injects the variables (Compose `env_file`, pm2, ECS).
2. **`instrumentation`** starts the OpenTelemetry NodeSDK with the auto-instrumentations (section 11).
3. **`new ShutdownManager({ timeout: 15000 })`**, then **`new InfiniteNodeApplication(routes, shutdownManager)`**:
   - creates the Express app and an HTTP server around it, and tracks open connections;
   - registers the shutdown hooks (below);
   - registers `httpServer`, `expressServer` and `appMetadata` in the container. The socket driver needs
     `httpServer`, so this happens before infrastructure;
   - starts `InfrastructureManager.init()` without awaiting it.
4. **Signal and process error handlers**, then **`listen()`**: the port opens now.
5. **When `init()` resolves:**
   1. `autoRegisterApplicationComponents()`;
   2. the core middleware, in this order: `cookieParser`, `session`, `cors`, `helmet`, `rateLimit` (Redis store
      through `cache`, falling back to memory), `morgan`, `json` (10 MB), `urlencoded`, `contentType` (JSON), and a
      request `logger`;
   3. `scopePerRequest(container)`;
   4. the routes, under `apiUrlPrefix` (default `/api/v1/`).

If any step fails, the error is logged and the process exits with code 1.

Mounted routes (`src/presentation/http/routes/index.ts`): `/health`, `/auth`, `/auth/resources`, `/auth/roles`,
`/users`, `/app/emails`. Which of them are public: §9.5.

### Shutdown

`SIGINT`, `SIGTERM` and `SIGUSR2` start a graceful shutdown, and so does an unhandled rejection; an uncaught exception
exits at once. `ShutdownManager` runs the hooks by priority (hooks of one priority in parallel), each within its own
timeout, and force-exits after 15 s.

| Priority | Hook                      | Timeout | Does                                                       |
| -------- | ------------------------- | ------- | ---------------------------------------------------------- |
| CRITICAL | `http-server`             | 5 s     | Stops accepting connections and closes the open ones       |
| MEDIUM   | `infrastructure-services` | 8 s     | `InfrastructureManager.shutdown()`, in reverse build order |
| LOW      | `telemetry`               | 2 s     | `otelSdk.shutdown()`: flushes spans and log records        |

## 6. The worker process

`src/worker.ts` has the same first two imports and the same `ShutdownManager`, then starts `InfiniteNodeWorker`:

1. sets `INSTANCE_TYPE=WORKER`, so the logger writes to the worker's own log files;
2. `InfrastructureManager.initForWorker()`: every infrastructure service except `socket`;
3. `autoRegisterWorkerComponents()`: application services, domain services, repositories and workers, without
   controllers;
4. resolves every registration whose name ends in `Worker` and that has the `IWorker` methods (`workerName`, `init`,
   `shutdown`), then awaits each worker's `init()`, which starts its queue processors;
5. registers the shutdown hooks.

| Priority | Hook                      | Timeout | Does                                                            |
| -------- | ------------------------- | ------- | --------------------------------------------------------------- |
| HIGH     | `workers`                 | 10 s    | Every worker's `shutdown()`, which waits for the jobs in flight |
| MEDIUM   | `infrastructure-services` | 8 s     | Closes Redis, the database and the rest                         |
| LOW      | `telemetry`               | 2 s     | Flushes telemetry                                               |

Workers stop first, so the jobs they are running finish while Redis and the database are still connected.

The work runs in its own process so that slow or retried jobs (sending email) never hold up HTTP requests, the two
can be scaled separately, and a job's crash can't take the API down. Rules for writing a worker: §11.5.

## 7. Life of a request

`PUT /api/v1/auth/resources/:id`, with a body `{ name?, description?, version }`:

```
auth-resource.routes.ts        router.put('/:id', …)
  │ UserValidatorMiddleware    Bearer token → LoginApplicationService.validate() → req.user (401 / 503 on failure)
  │ RequestValidatorMiddleware updateResourceValidator(): version is required (400 on failure)
  ▼
ResourceController.update      catchExceptionsWrapper(): matchedData(req), getStringParam(req, 'id')
  ▼
ResourceService.update         wrapInfrastructureErrors():
  │                              read the resource (NOT_FOUND) → assertVersion() (CONFLICT)
  │                              → name uniqueness pre-check (ALREADY_EXISTS) → apply the changes
  ▼
ResourceRepository.update      BaseRepository.update() inside wrapDatabaseErrors():
  │                              findOneAndUpdate({ _id, __v: version }, { $set, $inc: { __v: 1 } })
  ▼
ResourceMapper                 toPersistence() for the write, toDomain() for the result (version + 1)
  ▼
ApiResponseUtils               apiOkResponse(200, …) → createResponse(res)
```

Each layer does one job:

- the route wires authentication and validation;
- the controller turns HTTP into a call and the result (or error) back into HTTP;
- the domain service owns the rules and the error types;
- the repository owns the query, and its conditional write rejects a stale version even when two requests pass the
  check at once (§6.8).

A request that needs a transaction goes through an application service between the controller and the domain
service (§8.1); the signup flow below is one.

## 8. Life of a queued job

`POST /api/v1/auth/register` creates the user in a transaction and emails a verification code through the worker:

```
API process
  SignupController.register
    → SignupApplicationService.register()
        dbTransaction(({ session }) => default group, default role, user, verification code)   (§8)
        after the commit: sendVerificationEmail() → emailService.enqueueEmail(new NewEmail({ …, status: 'pending' }))
          → BaseEmailService.enqueueEmail(): the whole email as one BullMQ job, under a fixed id; no database write
                        │
                        ▼  Redis (email queue: EMAIL_QUEUE_NAME, attempts, backoff)
Worker process
  EmailWorker.init() → queue.processJobs(emailQueueName(), job => emailService.deliverQueuedEmail(job))
    → log the email as pending → transport() through the circuit breaker → mark it sent (or failed on the last try)
```

Queueing happens after the commit and its failure is only logged, so a queue outage never rolls back a registration.
The rules (queue first, log second; retries; when an email is marked failed) are in `Docs/features/email.md`.

## 9. Errors across the layers

Each boundary translates the errors from the layer below into the ones the layer above understands:

```
driver / library error
  ▼ BaseRepository.wrapDatabaseErrors()         (§6.5)
RepositoryError (DUPLICATE_KEY, INVALID_ID, VERSION_CONFLICT) · InfrastructureError CONNECTION_ERROR · PersistanceError
  ▼ BaseDomainService.wrapInfrastructureErrors() (§7.1, §10)
DomainServiceError (ALREADY_EXISTS, VALIDATION_ERROR, CONFLICT, INFRASTRUCTURE_ERROR, …)
  ▼ BaseController.catchExceptionsWrapper()      (§9.2, §10)
HTTP status + message (generic for infrastructure failures; the full error is logged with the trace_id)
```

| Error                                        | Defined in                                        | Thrown by                                           | Becomes                                            |
| -------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `DomainEntityError`                          | `src/domain/base/`                                | A model guarding its invariants (§5.2)              | 400 with its message                               |
| `DomainServiceError`                         | `src/domain/base/service/`                        | Domain and application services (§7.3)              | Status by type (§10)                               |
| `RepositoryError`                            | `src/application/interfaces/errors/`              | Repositories: caller data rejected                  | A `DomainServiceError` with a fixed safe message   |
| `InfrastructureError` and its subclasses     | `src/application/interfaces/errors/`, per service | Infrastructure services, `BaseRepository`           | `INFRASTRUCTURE_ERROR` → generic 503 / 500         |
| `PersistanceError`                           | `src/infrastructure/persistance/database/errors/` | Mongoose service, repositories, mappers             | As `InfrastructureError` (`DATABASE_ERROR`)        |
| `CircuitOpenError`                           | `src/infrastructure/core/errors/`                 | `CircuitBreaker.execute()`                          | As `InfrastructureError` (`CONNECTION_ERROR`, 503) |
| `DriverError`                                | `src/infrastructure/core/errors/`                 | Drivers at startup                                  | Startup fails, exit code 1                         |
| `PaginationException`, `RouteParamException` | `src/app/core/utils/`                             | `BaseController.getPaginator()`, `getStringParam()` | 400 with its message                               |

The full status table is `CLAUDE.md` §10. In a worker there is no controller: an error that leaves a job goes to
BullMQ, which retries the job and logs the failure.

## 10. Keeping data consistent

Three mechanisms work together:

- **Unique indexes (§6.7).** A domain service checks uniqueness first for a clear message, but only the index stops
  two concurrent requests from both writing. The loser gets `DUPLICATE_KEY` → `ALREADY_EXISTS`.
- **Versions (§5.4, §6.8, §7.6).** Every root entity carries `version` (Mongoose's `__v`). A client sends back the
  version it read; the service rejects a stale one with `CONFLICT` (409) before writing, and the repository's
  conditional write rejects one that went stale in between.
- **Transactions (§8).** An operation of several writes runs in `dbTransaction()`, started by an application service,
  with `{ session }` passed to every call inside. MongoDB runs as a replica set (`rs0`) because transactions need one.
  Transient write conflicts are retried by re-running the callback.

## 11. Cross-cutting concerns

- **Configuration.** `src/app/core/config/` holds the application's own settings (name, port, API prefix, JWT,
  middleware). Each infrastructure driver reads its settings in its own `*.config.ts`. `.env.example` lists every
  variable.
- **Logging.** The `logger` service (Winston) writes daily-rotated files, separate for the API and the worker
  (`INSTANCE_TYPE`). Code logs through the injected `ILogger`, never `console`.
- **Telemetry.** `instrumentation.ts` starts the NodeSDK with the auto-instrumentations; exporters and sampling come
  from the `OTEL_*` variables. Health endpoints are not traced. The Winston instrumentation adds `trace_id` and
  `span_id` to every log record and exports the records over OTLP; BullMQ's telemetry carries the trace from the job's
  producer to its consumer. `docker-compose.observability.yml` adds a local Grafana stack (UI on 3300).
- **Health.** `GET /health` reports each infrastructure service (`healthy`, `degraded`, `unhealthy`; 200 only when
  healthy), `/health/ready` the same for readiness probes, `/health/live` only that the process answers.
- **Security.**
  - HTTP: helmet headers, CORS and a rate limit backed by Redis (memory when Redis is down).
  - Authentication: RS256 JWT access and refresh tokens, argon2 password hashes.
  - Routes: authentication on every route except the public ones (§9.5), and `PermissionMiddleware` on role-limited
    ones (§9.6).
  - Errors: infrastructure error messages never reach a client (§9.4).

## 12. One resource across the layers

A complete resource is made of these files; some are conditional. The step-by-step checklist is `CLAUDE.md` §13.1.

| #   | File                                   | Path                                                                                           | Purpose                                                                                                       |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Route                                  | `src/presentation/http/routes/{feature}.routes.ts`                                             | Wires middleware and binds URLs to controller methods resolved from the container                             |
| 2   | Controller                             | `src/presentation/http/controllers/{feature}/{name}.controller.ts`                             | Turns the request into a service call and the result into a response                                          |
| 3   | Application service _(conditional)_    | `src/application/services/{feature}/{name}.application.service.ts`                             | Starts the database transaction for an operation that needs one (§8.1)                                        |
| 4   | Domain service                         | `src/domain/{feature}/service/{name}.service.ts`                                               | The business rules for one model; calls the repository                                                        |
| 5   | Domain model _(+ optional type guard)_ | `src/domain/{feature}/models/{name}.ts` (+ `models/guards/{name}.guards.ts`)                   | The source of truth for the resource's shape and invariants (`INewX`, `IX`, `NewX`, `X`)                      |
| 6   | Repository                             | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.repository.ts` | Queries through Mongoose; extends `BaseRepository`                                                            |
| 7   | Schema                                 | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.model.ts`      | `INew{Model}Schema` only, the Mongoose `Schema` with its indexes, and the model                               |
| 8   | Mapper                                 | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.mapper.ts`     | Translates between the stored document and the domain model                                                   |
| 9   | Seeder _(if applicable)_               | `src/infrastructure/persistance/database/seeders/{feature}.seeder.ts`                          | Default data: `seed{Feature}()` / `clear{Feature}()`, registered by hand, in dependency order, in `seeder.ts` |

The repository interface (`src/application/interfaces/repositories/{feature}/`) and the validators
(`src/presentation/http/validators/{feature}/`) go with them.

> **Folder names don't always match across layers.** The domain feature `auth` holds `role.ts` and `resource.ts`, but
> their Mongoose folders are `roles/` and `resources/`. Copy an existing, similar resource rather than assuming one
> name for every layer.

> ⚠️ **Keep the file set in sync.** The domain model is the source of truth for the resource's shape. A change to it
> (adding, removing, renaming or retyping a field, or changing an invariant) is not complete until every other file
> that touches that field follows:
>
> - **Schema** → the field and its type, and any index on it
> - **Mapper** → `toDomain()` / `toPersistence()`
> - **Repository** → custom queries and filters on the field
> - **Validators** → the create and update schemas
> - **Controller** → any response it builds by hand
> - **Seeder** → the default data
>
> Treat "the domain model changed" as a reason to search the resource's other files for the field before calling the
> change done.

## 13. Runtime and deployment

**Docker Compose** (`docker-compose.yml`):

| Service        | Does                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| `mongodb`      | MongoDB 7 as the single-node replica set `rs0`                                    |
| `mongodb-init` | One-off: initiates the replica set                                                |
| `db-indexes`   | One-off: `npm run db:indexes:prod`, before the app starts (§6.7)                  |
| `seed`         | One-off: `npm run seed:prod` (resources, roles, user groups, users)               |
| `redis`        | Redis 7                                                                           |
| `app`          | The API (production image target) on port 3000; starts after the one-off services |
| `worker`       | The worker process from the same image                                            |
| `mailhog`      | Only with `--profile dev`: catches SMTP mail (SMTP 1025, UI 8025)                 |

`docker-compose.observability.yml` turns telemetry on for `app` and `worker` and adds Grafana's `otel-lgtm` (UI 3300,
OTLP 4318).

**Image** (`Dockerfile`): `base` → `development` (runs `npm run dev`) and `build` (`npm run build`, then prunes dev
dependencies) → `production` (runs `dist/` as a non-root user under `dumb-init`).

**Without Docker:** `npm run dev` / `npm run worker:dev` (or both under pm2 with `npm run dev:all`), and
`ecosystem.prod.config.js` for both compiled processes.

**CI:** `.github/workflows/docker-ecr.yml` builds the production image on a push to `main` and pushes it to Amazon ECR,
tagged `latest` and with the commit SHA. The ECS services and their infrastructure live outside this repository.

## 14. Known gaps

Behaviour that differs from what you might expect. Planned work: `CLAUDE.md` §14 and `Docs/TODO.yml`.

- The port opens before the middleware and routes are mounted (`listen()` runs while infrastructure is still
  starting), so a request in the first moments of boot gets Express's default 404.
- There is no 404 handler or error-handling middleware: an unknown route gets Express's default response.
- `scopePerRequest()` is mounted, but routes resolve controllers from the root container, so no request scope is used.
- `server.config.ts` reads `SSL_ENABLED`, `SSL_KEY_PATH` and `SSL_CERT_PATH`, but nothing uses them: the server is
  plain HTTP, and TLS ends at the proxy.
- The production image exposes and health-checks port 3001, while the app listens on `NODE_PORT` (3000 by default and
  in Compose), so the image's `HEALTHCHECK` can't reach it.
- A failure during boot exits with code 1 without running the shutdown hooks.
- `base.application.service.ts` matches the auto-registration glob and has a default export, so
  `baseApplicationService` is registered with a constructor parameter (`databaseMapperService`) that no token matches.
  Nothing resolves it, so it never fails.
- With the default drivers, `/health` and `/health/ready` report `degraded` (503); see the Known gaps in
  `Docs/architecture/infrastructure-layer-pattern.md`.

## 15. Related documents

| Document                                                  | Read it for                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `CLAUDE.md`                                               | Every rule, with its reason and use cases                       |
| `Docs/architecture/infrastructure-layer-pattern.md`       | Infrastructure services: contracts, lifecycle, failure handling |
| `Docs/prompts/API_Resource_Guide.md`                      | Building a full resource, layer by layer                        |
| `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`    | Domain models, schemas, mappers, sub-documents                  |
| `Docs/prompts/Database_Seeding_Guide.md`                  | Seeders                                                         |
| `Docs/features/email.md`, `Docs/features/notification.md` | Email and push notification specifics                           |
| `Docs/Getting_Started.md`                                 | Local setup, environment, JWT keys                              |
