## Infinite Node Application

Production-ready Express + TypeScript starter with strong typing, DI, pluggable services, structured logging, Redis-backed rate limiting, and MongoDB models out of the box.

This repo is designed to be cloned, configured via environment files, and run locally or in Docker/PM2 with minimal friction.

## Highlights

- TypeScript-first, strict tsconfig and ESLint + Prettier
- Express server with a clean startup flow and health endpoint
- Awilix DI container and modular service loaders
  - Redis cache (Node-redis)
  - Mongoose (MongoDB)
  - MySQL or MongoDB native client (choose by env)
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
- DB: MongoDB (Mongoose), MySQL (mysql driver)
- Cache/Queue: Redis (node-redis, BullMQ)
- Logging: Winston + winston-daily-rotate-file
- Validation: express-validator

## Quickstart

Prerequisites

- Node.js 18+ (LTS recommended) and npm
- MongoDB running locally (or connection URI)
- Redis running locally

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

# MongoDB
MONGODB_URI=mongodb://localhost:27017/infinite-node

# Redis / Cache
CACHE_DRIVER=redis
CACHE_SERVER_URL=redis://127.0.0.1:6379
CACHE_TTL=3600

# MySQL (only if DB_DRIVER=mysql)
DB_DRIVER=mysql
MYSQL_DATABASE_SERVER_HOST=localhost
MYSQL_DATABASE_USERNAME=root
MYSQL_DATABASE_PASSWORD=
MYSQL_DATABASE_NAME=infinite_node

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

3. Run in development

```powershell
npm run dev
```

The server prints startup info and listens on NODE_PORT (default 3000). Health check is available at:

- GET http://localhost:3000/health → 200 OK

4. Build and run in production mode

```powershell
npm run build
npm start
```

## NPM scripts

- dev: Run ts-node-dev on src/index.ts
- build: Prettier format then tsc emit to dist/
- start: node dist/index.js
- lint / lint:fix: ESLint with TypeScript + Prettier
- test: Jest (ts-jest + babel-jest configured)
- seed: Run TypeScript DB seeder

## How it works

### Entry point and startup flow

- src/index.ts constructs InfiniteNodeApplication with routes and calls listen().
- src/app/app.ts:
  1.  Loads dotenv from .env.{NODE_ENV}
  2.  Loads config via configLoader()
  3.  Creates Express app and HTTP server
  4.  Registers httpServer and expressServer into Awilix container
  5.  Initializes core services (DI): cache, db, queue, mongoose, socket, storage, email, notification, logger
  6.  Builds middleware stack (cookie-parser, session, CORS, helmet, rate-limit with Redis store, morgan, JSON, urlencoded, content-type, request logger)
  7.  Adds /health endpoint
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

- Container in src/app/core/services/service.container.ts
- Service loaders in src/app/core/services/\*\*/\*.service.loader.ts register concrete instances under well-known names (e.g., cache, db, mongoose, queue, socket, logger)
- Service initialization order is governed by initializeCoreServices(); “deferred” services are queued then initialized afterwards in the same startup

### Middleware pipeline

- Built in coreMiddleware(); uses middleware.config.ts
- Rate limiter uses RedisStore; requires the cache service to be available
- Request logging uses the winston logger resolved from the container

### Routing, controllers, models

- Routes are mounted at /api/v1 by default (configurable)
- Current routes: src/routes/auth.routes.ts under /auth
  - POST /api/v1/auth/login → LoginController.login
  - GET /api/v1/auth/validate → LoginController.validate
  - GET /api/v1/auth/logout → LoginController.logout
  - POST /api/v1/auth/register → SignupController.register
  - GET /api/v1/auth/verify-email → SignupController.verifyEmail
  - POST /api/v1/auth/forgot-password → AccountRecoveryController.forgotPassword
  - POST /api/v1/auth/reset-password → AccountRecoveryController.resetPassword
- Validation: RequestValidatorMiddleware wraps express-validator schemas
- API responses: APIResponse + helpers in app/utils/api-response
- Mongoose models: User, LoginRecord, CustomerGroup, PasswordResetCodes

### Logging

- Winston DailyRotateFile configured; logs directory is logs/
- A request logger middleware logs method/path/ip via the DI logger

## Docker

The Dockerfile is multi-stage (development, build, production) and uses dumb-init and basic dependency checks for Redis and MongoDB.

Important notes

- Healthcheck probes http://localhost:3001/health. Either:
  - Set NODE_PORT=3001 inside the container, or
  - Change EXPOSE/healthcheck port to match your chosen NODE_PORT
- The container waits for hosts named mongodb:27017 and redis:6379; prefer Docker Compose with those service names or adjust the start command

Example build/run

```powershell
docker build -t infinite-node-app .
docker run --rm -p 3000:3000 -e NODE_ENV=production -e NODE_PORT=3000 `
	--add-host=host.docker.internal:host-gateway infinite-node-app
```

If running MongoDB/Redis as sibling containers, use a compose file so their hostnames are mongodb and redis. Alternatively supply MONGODB_URI and CACHE_SERVER_URL to point at external services.

## PM2

Run with TypeScript via PM2:

```powershell
npm i -g pm2
pm2 start ecosystem.config.js --env development
```

## Testing

```powershell
npm test
```

Jest matches tests under src/\*_/_.spec.(ts|js). There are example specs in app/utils/filteration and pagination.

## Troubleshooting

- 429 Too many requests: Ensure Redis is reachable; the rate limiter uses a Redis store via the DI cache service
- MongoDB connection errors: Verify MONGODB_URI; models use Mongoose, separate from the native MongoDB client optionally registered when DB_DRIVER=mongodb
- Health check failing in Docker: Ensure NODE_PORT matches the healthcheck port (3001 by default in Dockerfile) or adjust Dockerfile
- Logs not created: Confirm write permissions to ./logs in container/host

## Extending

- Add services by creating a service loader and adding it in src/app/core/services/services.loader.ts and corresponding config in src/app/core/config/service
- Add feature routes under src/routes and controllers under src/controllers; mount new routes in src/routes/index.ts

## License

MIT © 2025 Maleesha Gimshan
