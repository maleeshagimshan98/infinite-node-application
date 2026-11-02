## Infinite Node Application

Production-ready Express + TypeScript starter with strong typing, DI, pluggable services, structured logging, Redis-backed rate limiting, and MongoDB models out of the box.

This repo is designed to be cloned, configured via environment files, and run locally or in Docker/PM2 with minimal friction.

## Highlights

- TypeScript-first, strict tsconfig and ESLint + Prettier
- Express server with a clean startup flow and health endpoint
- Awilix DI container and modular infrastructure services (auto-registered via
  `infrastructure.loader.ts`)
  - Redis cache (Node-redis)
  - MongoDB via Mongoose (swappable via `DATABASE_MAPPER_DRIVER`; only `mongoose` is implemented
    today — a **replica set** is required, the domain layer runs multi-document transactions)
  - BullMQ queue (Redis)
  - Socket.io (bound to the HTTP server)
  - Winston logging with daily rotate files (logs/)
  - Email/Notification placeholders (ready to extend)
- Centralized API response format and validation helpers
- Auth example (login/register/forgot/reset/verify)
- Dockerfile (multi-stage) and PM2 ecosystem file

## Tech Stack

- Runtime: Node.js 18+ (Dockerfile uses Node 22 Alpine)
- Framework: Express 4
- Language: TypeScript 5
- DI: Awilix + awilix-express
- DB: MongoDB (Mongoose), configured as a replica set (transactions)
- Cache/Queue: Redis (node-redis, BullMQ)
- Logging: Winston + winston-daily-rotate-file
- Validation: express-validator

## Quickstart

> For the full first-run walkthrough (Docker Compose vs. local setup, generating JWT keys for
> local and production environments, what the seeders create and why order matters, production
> notes), see
> [`Docs/Getting_Started.md`](Docs/Getting_Started.md). The steps below are the short version.

Prerequisites

- Node.js 18+ (LTS recommended) and npm
- MongoDB 7+ running as a **replica set** (a single-node `rs0` is enough) — required, the
  application/domain services run multi-document transactions, which MongoDB only supports inside
  a replica set. Setting it up via Docker Compose (below) handles this for you; for a native
  install on Windows or Linux, see
  [`Docs/guides/REPLICA_SET_SETUP_GUIDE.md`](Docs/guides/REPLICA_SET_SETUP_GUIDE.md)
- Redis running locally (the rate limiter is Redis-backed; `REDIS_SERVICE_OPTIONAL=true` lets the
  app boot without it, but treat it as required outside quick experiments)

1. Clone and install

```powershell
git clone https://github.com/maleeshagimshan98/infinite-node-application.git
cd infinite-node-application
npm ci
```

2. Environment files

The app loads .env files by NODE_ENV in src/app/app.ts:

```ts
dotenv.config({ path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV}`) });
```

Create .env.development for local dev (example):

```dotenv
# App
NODE_ENV=development
APP_NAME=Infinite Node Application
APP_VERSION=1.0.0
APP_BASE_URL=http://localhost:3000
API_URL_PREFIX=/api/v1
NODE_PORT=3000

# MongoDB — replicaSet is required, the domain layer runs multi-document transactions
MONGODB_URI=mongodb://localhost:27017/infinite-node?replicaSet=rs0

# Redis / Cache
CACHE_DRIVER=redis
CACHE_SERVER_URL=redis://127.0.0.1:6379
CACHE_TTL=3600

# JWT (RS256) — see Docs/Getting_Started.md#4-generating-jwt-rs256-keys to generate these
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=

# Sessions & Cookies
COOKIE_SECRET=dev_cookie_secret
SESSION_SECRET=dev_session_secret
SESSION_RESAVE=false
SESSION_SAVE_UNINITIALIZED=false
COOKIE_DOMAIN=localhost
COOKIE_PATH=/
COOKIE_PRIORITY=low
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_MAX_AGE=3600000
COOKIE_PARTITIONED=false

# CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=false

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging (Winston)
WINSTON_LOG_FILE_NAME=./logs/application-%DATE%.log
WINSTON_LOG_DATE_PATTERN=YYYY-MM-DD
WINSTON_LOG_LEVEL=info
```

3. Seed default data

The app expects some default data to exist before it's usable — default RBAC resources/roles and
the default user group new signups are assigned to. See
[`Docs/Getting_Started.md`](Docs/Getting_Started.md#5-what-gets-seeded-and-why-the-order-matters)
for exactly what gets created and why the order matters.

```powershell
npm run seed
```

Safe to re-run — every seeder skips data that already exists.

4. Run in development

```powershell
npm run dev
```

The server prints startup info and listens on NODE_PORT (default 3000). Health checks are
mounted under the API prefix:

- GET http://localhost:3000/api/v1/health → full status (DB/cache/queue/etc.)
- GET http://localhost:3000/api/v1/health/live → liveness probe
- GET http://localhost:3000/api/v1/health/ready → readiness probe

`/health` and `/health/ready` return 200 only when every service is connected, otherwise 503
(`degraded`, or `unhealthy` when the database is down). The response shows each service's
`status` and `latency` only — driver error details are written to the server log, not returned.
Services guarded by circuit breakers also report `circuit_breakers` (state, failure count and
threshold): `email` always lists its one breaker, `httpClient` lists only hosts whose circuit is
open or half-open. Breaker names (hosts) are logged rather than returned, and breaker state never
changes the status code.

5. Build and run in production mode

```powershell
npm run build
npm start
```

## NPM scripts

- dev: Type-check then run `tsx watch` on src/index.ts
- worker:dev: Type-check then run `tsx watch` on src/worker.ts (BullMQ worker process)
- build: Prettier format, then `tsc` emit to dist/ and resolve path aliases with `tsc-alias`
- start: node dist/index.js
- worker:start: node dist/worker.js
- start:all / dev:all: Run app + worker together via PM2 (dev: `ecosystem.dev.config.js`, runs
  `src/*.ts` via ts-node with file watching; prod: `ecosystem.prod.config.js`, runs the compiled
  `dist/*.js` — `start:all` rebuilds first via a `prestart:all` hook)
- lint / lint:fix: ESLint with TypeScript + Prettier
- format: Prettier write across the repo
- test: Jest (ts-jest + babel-jest configured)
- seed / seed:clear: Run the TypeScript DB seeder directly (`tsx`) — seed or clear default data
- seed:prod / seed:prod:clear: Same, against the compiled `dist/` output (requires `npm run build`
  first, unless using the Docker image's build stage)

## How it works

### Entry point and startup flow

- src/index.ts constructs InfiniteNodeApplication with routes and calls listen().
- src/app/app.ts:
  1.  Loads dotenv from .env.{NODE_ENV}
  2.  Loads config via configLoader()
  3.  Creates Express app and HTTP server
  4.  Registers httpServer, expressServer and appMetadata (name, version, url, port, environment) into Awilix container
  5.  Initializes infrastructure services (DI) via `InfrastructureManager`: cache, database mapper (Mongoose), queue, socket, storage, email, notification, http client, logger
  6.  Builds middleware stack (cookie-parser, session, CORS, helmet, rate-limit with Redis store, morgan, JSON, urlencoded, content-type, request logger)
  7.  Mounts /health, /health/live, /health/ready
  8.  Mounts routes at {API_URL_PREFIX} (default /api/v1)
  9.  Starts listening on NODE_PORT

### Configuration

Located in src/app/core/config:

- app.config.ts: App meta, baseUrl, apiUrlPrefix, port
- server.config.ts: SSL flags and certs (optional)
- middleware.config.ts: Builds middleware options from env; rate-limit uses a Redis store wired via the DI container (cache)
- service/\*: Each service has a strongly-typed config structure (cache, db, mongoose, queue, socket, storage, email, notification, logging)
- config.ts: Aggregates the above into INodeApplicationConfig

### Dependency Injection (Awilix)

- Container in src/app/core/service.container.ts, using CLASSIC injection mode (constructor
  parameter names must match DI token names)
- Infrastructure services (cache, db, queue, socket, logger, email, notification, storage, http)
  are registered by `InfrastructureManager.init()`, iterating the factory list in
  src/infrastructure/infrastructure.loader.ts
- `autoRegisterApplicationComponents()` glob-discovers application services, domain services,
  repositories, and controllers and registers each under a camelCase token derived from its class
  name (e.g. `CustomerService` → `customerService`)

### Middleware pipeline

- Built in coreMiddleware(); uses middleware.config.ts
- Rate limiter uses RedisStore; requires the cache service to be available
- Request logging uses the winston logger resolved from the container

### Routing, controllers, models

- Routes are mounted at /api/v1 by default (configurable via `API_URL_PREFIX`), registered in
  src/presentation/http/routes/index.ts
- src/presentation/http/routes/auth.routes.ts under /auth
  - POST /api/v1/auth/login → LoginController.login
  - GET /api/v1/auth/validate → LoginController.validate (Nginx `auth_request` style check)
  - POST /api/v1/auth/refresh → LoginController.refresh
  - GET /api/v1/auth/logout → LoginController.logout
  - POST /api/v1/auth/register → SignupController.register
  - GET /api/v1/auth/verify-email → SignupController.verifyEmail
  - POST /api/v1/auth/forgot-password → AccountRecoveryController.forgotPassword
  - POST /api/v1/auth/reset-password → AccountRecoveryController.resetPassword
- src/presentation/http/routes/auth-resource.routes.ts under /auth/resources — RBAC resource CRUD
- src/presentation/http/routes/auth-role.routes.ts under /auth/roles — RBAC role CRUD
- src/presentation/http/routes/user.routes.ts under /users — user CRUD
- src/presentation/http/routes/health.routes.ts under /health — see [Quickstart](#quickstart)
- Validation: RequestValidatorMiddleware wraps express-validator schemas; UserValidatorMiddleware
  authenticates the request on every route (per §13 of `CLAUDE.md`)
- API responses: ApiResponseUtils in app/core/utils/api-response. Infrastructure failures
  (database, cache, queue, …) always answer with a generic 500, or 503 for network/connection
  failures — the underlying error is logged, never returned (see §15 of `CLAUDE.md`)
- Mongoose models: User, LoginRecord, UserGroup, PasswordResetCodes, Resource, Role

### Logging

- Winston DailyRotateFile configured; logs directory is logs/
- A request logger middleware logs method/path/ip via the DI logger

## Docker

The Dockerfile is multi-stage (development, build, production) and uses dumb-init.
`docker-compose.yml` at the repo root runs the full local stack — app, a separate BullMQ **worker**
container, MongoDB (with a one-shot job that initializes its `rs0` replica set), Redis, and a
one-shot seed job that runs before the app/worker containers start. The `app` and `worker`
containers are built from the exact same image (only `app` declares a `build:` section; `worker`
and `seed` just reference the resulting tag) and differ only in their `command` — `worker` has no
HTTP server, so it has no port mapping and its healthcheck is disabled. Container names and the
shared image tag are derived from the `APP_NAME` variable in `.env` (copied from `.env.example`).
See [`Docs/Getting_Started.md`](Docs/Getting_Started.md#2-option-a--full-stack-via-docker-compose-fastest-path)
for the step-by-step (env file to copy, secrets to fill in, how to confirm seeding succeeded).

```powershell
cp .env.example .env.production   # then fill in COOKIE_SECRET, SESSION_SECRET, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY
docker compose up -d --build
```

Important notes

- Healthcheck probes `http://localhost:3001/api/v1/health/live`. Either set `NODE_PORT=3001`
  inside the container, or change the `EXPOSE`/`HEALTHCHECK` line in the Dockerfile and the
  compose port mapping to match your chosen `NODE_PORT`
- Outside Compose, the app expects MongoDB and Redis reachable at whatever `MONGODB_URI` /
  `REDIS_SERVER_URL` point to — supply those to target external services instead
- Hand-filling `.env.production` as shown above is fine for local/quick Compose testing only —
  the file is gitignored. For a real deployment, don't keep secrets in a plaintext env file on
  the host at all; generate and inject them properly instead — see
  [`Docs/Getting_Started.md`](Docs/Getting_Started.md#4-generating-jwt-rs256-keys) for the
  local-vs-production breakdown (key generation, storing in a secret manager, and injecting into
  the container)

Standalone image build/run (bring your own MongoDB/Redis):

```powershell
docker build -t infinite-node-app .
docker run --rm -p 3000:3000 -e NODE_ENV=production -e NODE_PORT=3000 `
	--add-host=host.docker.internal:host-gateway infinite-node-app
```

## PM2

Run app + worker together via PM2. In development this runs TypeScript sources directly
(ts-node + file watching); in production it runs the compiled `dist/` output:

```powershell
npm i -g pm2

# Development — src/*.ts via ts-node, file watching enabled
npm run dev:all
# equivalent to: pm2 start ecosystem.dev.config.js

# Production — builds dist/ first, then runs it via plain node
npm run start:all
# equivalent to: npm run build && pm2 start ecosystem.prod.config.js
```

## Testing

```powershell
npm test
```

Jest matches tests under `src/**/*.spec.(ts|js)`, next to the code they cover (e.g. the
infrastructure services' error handling, `BaseController` error responses, pagination). They run
without external services, except `base-repository.spec.ts`, which needs a real MongoDB at
`MONGODB_TEST_URI` (default `mongodb://localhost:27017/infinite-node-application-test`).

## Troubleshooting

- 429 Too many requests: Ensure Redis is reachable; the rate limiter uses a Redis store via the DI cache service
- Transaction/session errors on signup or seeding: `MONGODB_URI` is missing `?replicaSet=rs0`, or the replica set was never initiated — connect with `mongosh` and run `rs.status()` to confirm. For a from-scratch native setup, see [`Docs/guides/REPLICA_SET_SETUP_GUIDE.md`](Docs/guides/REPLICA_SET_SETUP_GUIDE.md). Over HTTP this shows only as a generic 500 — look in the server log for `PersistanceError` `Failed to execute transaction: Transaction numbers are only allowed on a replica set member or mongos`
- A generic 500/503 from any endpoint: infrastructure error details are never returned to the client — check the server log for the full error
- Health check failing in Docker: Ensure NODE_PORT matches the healthcheck port (3001 by default in Dockerfile) or adjust Dockerfile
- Logs not created: Confirm write permissions to ./logs in container/host
- More seeding-specific issues: see [`Docs/Getting_Started.md`](Docs/Getting_Started.md#7-troubleshooting)

## Extending

- Add an infrastructure service by following the pattern in §14 of `CLAUDE.md` (interface → driver
  → service → factory), then register the factory in
  src/infrastructure/infrastructure.loader.ts
- Add feature routes under src/presentation/http/routes and controllers under
  src/presentation/http/controllers; mount new routes in
  src/presentation/http/routes/index.ts

## License

MIT © 2025 Maleesha Gimshan — see [LICENSE](LICENSE).
