# Infinite Node Application — CLAUDE.md

This file and the rule files it points to in `Docs/rules/` are the single source of the rules, structure and patterns
for **every** AI agent working in this repository (Claude, Codex, Copilot, Cursor, …). `AGENTS.md` only points here.
This file holds what every change needs; read a rule file before you work on what its row below names. When existing
code disagrees with the rules, follow the rules and tell the user about the mismatch. Each rule is a card: **Rule**
(what to check), **Why**, **Use cases**, an example where the code shape matters, and a **Reference** file to copy
from.

---

## Rule files

Sections §5–§11, §13.3 and §14–§16 live in their own files. Their numbers are unchanged, so a `§` reference anywhere in
the repository (`CLAUDE.md` §6.7, say) still names the same rule, and this table says where it is. The rules in these
files are as binding as the ones here.

| §        | File                                 | Read it before you add or change                                                    |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| §5       | `Docs/rules/domain-modelling.md`     | A domain model or type guard                                                        |
| §6.1–6.3, §6.9–6.11 | `Docs/rules/mappers.md`   | A schema or mapper, or a sub-document                                               |
| §6.4–6.8 | `Docs/rules/repositories.md`         | A repository, a custom query or a unique index                                      |
| §7       | `Docs/rules/domain-services.md`      | A domain service                                                                    |
| §8       | `Docs/rules/application-services.md` | An application service or a database transaction                                    |
| §9       | `Docs/rules/presentation.md`         | A validator, controller, route or permission check                                  |
| §10      | `Docs/rules/errors.md`               | Which error to throw, or how an error reaches the client                            |
| §11      | `Docs/rules/infrastructure.md`       | An infrastructure service, driver, queue worker, external HTTP call, email or push |
| §13.3    | `Docs/rules/pull-requests.md`        | A pull request                                                                      |
| §14      | `Docs/rules/work-in-progress.md`     | Permissions, email, push notifications, the notification log or OpenTelemetry      |
| §15      | `Docs/rules/api-resource.md`         | A resource's file set, a change to a domain model, or a middleware                 |
| §16      | `Docs/rules/seeding.md`              | A seeder                                                                            |

---

## 1. Project at a glance

A clean-architecture Node.js/TypeScript service framework for building DDD-layered REST APIs, with a separate worker
process for queued jobs. Owner: Maleesha Gimshan ([@maleeshagimshan98](https://github.com/maleeshagimshan98)).

| Concern            | Technology                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Runtime / language | Node.js 22, TypeScript (`strict`, `exactOptionalPropertyTypes`)                                |
| HTTP / validation  | Express, express-validator, helmet, express-rate-limit with a Redis store (`rate-limit-redis`) |
| DI container       | Awilix (CLASSIC injection, singletons)                                                         |
| Database           | MongoDB 7 (replica set, for transactions) via Mongoose                                         |
| Cache / queues     | Redis 7, BullMQ                                                                                |
| Messaging          | nodemailer (SMTP) or AWS SES for email, AWS SNS for push (AWS SDK v3), Socket.IO               |
| Auth               | RS256 JWT access + refresh tokens (`jsonwebtoken`), argon2 password hashes                     |
| HTTP client        | Axios                                                                                          |
| Observability      | Winston (daily-rotated files), OpenTelemetry (traces + logs; `src/app/core/telemetry/`)        |
| Build / run        | `tsc` + `tsc-alias`; `tsx watch` in dev; pm2 for both processes                                |
| Tests / tooling    | Jest, ESLint, Prettier, Husky + lint-staged                                                    |

Deployment: Docker Compose locally. GitHub Actions builds the image and pushes it to Amazon ECR
(`.github/workflows/docker-ecr.yml`); the ECS services and their infrastructure code live outside this repository.

| Command                                   | What it does                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev` / `npm run worker:dev`      | Type-check, then run the API (`src/index.ts`) / the worker (`src/worker.ts`) with `tsx watch` |
| `npm run dev:all`                         | Both processes under pm2                                                                      |
| `npm run build`                           | `prettier --write .`, then `tsc` + `tsc-alias` into `dist/`                                   |
| `npm test`                                | Jest                                                                                          |
| `npm run lint` / `npm run lint:fix`       | ESLint (with Prettier) on `src/`                                                              |
| `npm run seed` / `npm run seed:clear`     | Seed (or clear) resources, roles, user groups and users                                       |
| `npm run db:indexes` / `db:indexes:check` | Apply / check the MongoDB indexes                                                             |

Local services (`docker-compose.yml`): the app on port 3000, MongoDB (replica set `rs0`, 27017) and Redis (6379)
inside the compose network, MailHog with `--profile dev` (SMTP 1025, UI 8025). `docker-compose.observability.yml` adds
Grafana's otel-lgtm stack (UI 3300, OTLP 4318).

| Guide                                                     | Read it for                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `Docs/Getting_Started.md`                                 | Local setup, env, JWT keys                                           |
| `Docs/prompts/API_Resource_Guide.md`                      | Building a full resource, layer by layer                             |
| `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`    | Domain models, schemas, mappers, sub-documents                       |
| `Docs/prompts/Database_Seeding_Guide.md`                  | Seeders                                                              |
| `Docs/architecture/application-architecture.md`           | How the layers, processes, request flow and errors fit together      |
| `Docs/architecture/infrastructure-layer-pattern.md`       | Infrastructure services in depth: contracts, lifecycle, failures     |
| `Docs/features/email.md`, `Docs/features/notification.md` | Email drivers and email log; push notifications and notification log |
| `Docs/TODO.yml`                                           | Planned work                                                         |

---

## 2. Application structure

```
src/
├── index.ts, worker.ts          # Entry points: API and worker process
├── app/
│   ├── app.ts, worker.ts        # InfiniteNodeApplication, InfiniteNodeWorker
│   └── core/                    # DI container (service.container.ts), config, telemetry, middleware, shutdown, utils
├── presentation/http/           # routes/, controllers/, validators/, middleware/
├── application/
│   ├── interfaces/              # Every cross-layer contract: repositories/, infrastructure/, errors/, worker/, app/
│   ├── services/{feature}/      # Application services (database transactions)
│   └── workers/{feature}/       # Queue workers (worker process only)
├── domain/
│   ├── base/                    # DomainEntity, DomainEntityError, BaseDomainService, DomainServiceError
│   └── {feature}/               # auth, user, app/email, app/notification, health
│       ├── models/              # Domain models (+ guards/ when needed)
│       └── service/             # Domain services
└── infrastructure/
    ├── core/                    # Driver and circuit-open errors, circuit breaker, driver and factory interfaces
    ├── persistance/database/    # Mongoose service, repositories/mongoose/{feature}/, seeders/, indexes/
    ├── cache/ email/ health/ http/ logger/ notification/ push-notification/ queue/ socket/ storage/
    ├── infrastructure.loader.ts # The list of service factories
    └── infrastructure.manager.ts
```

**Request flow:** Route → Controller → [Application service] → Domain service → Repository → MongoDB.

**Processes:** the API (`src/index.ts` → `InfiniteNodeApplication`) serves HTTP; the worker (`src/worker.ts` →
`InfiniteNodeWorker`) runs the queue workers. Both entry points must keep `load-env` and
`telemetry/instrumentation` as their first two imports: OpenTelemetry only instruments libraries loaded after it.

### 2.1 Keep imports pointing inward

**Rule:** Import only what this list allows. Code in an inner layer reaches outer code through an interface in
`src/application/interfaces/`, injected by DI.
**Why:** The domain must stay free of frameworks and drivers so it can be tested and its infrastructure swapped.

- **`domain/`** may import `@/domain/**` and `@/application/interfaces/**` only. Never `@/infrastructure/**`,
  `@/app/core/**`, `@/presentation/**`, application services, mongoose or express.
- **`application/services/`, `application/workers/`** may import `@/domain/**` and `@/application/**`. Never
  `@/infrastructure/**` or `@/presentation/**`.
- **`presentation/`** may import `@/application/**`, `@/domain/**` and `@/app/core/**`. Never `@/infrastructure/**`.
- **`infrastructure/`** may import `@/infrastructure/**`, `@/application/interfaces/**` and `@/domain/**` (the models
  it maps). Never `@/presentation/**`; `@/app/core/service.container` only in the seeders and the socket driver
  loader.

**Use cases:**

- a domain service needs the database, cache or email → inject the interface (`IRoleRepository`, `ICache`,
  `IEmailService`), never the class
- a domain service needs a config value or a helper from `@/app/core` → pass it in, or move the pure helper into
  `src/domain/base/`
- an inner layer needs to recognise an infrastructure failure → import the error contract from
  `src/application/interfaces/errors/` (`InfrastructureError`, `RepositoryError`), which every layer may import

---

## 3. Non-negotiable rules

1. Follow every pattern in these rules exactly; don't "improve" or deviate without the user's approval.
2. Imports point inward (§2.1).
3. Every auto-registered class ends with `export default ClassName;` (§4.1).
4. A schema file exports one root interface, `INew{Model}Schema` (§6.1).
5. Every uniqueness rule has a unique index, and every update and delete is a conditional write on the entity's
   `version` property (§6.7, §6.8, §7.6).
6. Domain services wrap every public method in `wrapInfrastructureErrors()` and throw only `DomainServiceError` (§7.1, §7.3).
7. All controller logic runs inside `catchExceptionsWrapper()` (§9.2).
8. `UserValidatorMiddleware` on every route except the listed public ones (§9.5).
9. Infrastructure errors mean infrastructure failures only, and their messages never reach the client (§11.3, §9.4).
10. `@/` imports and the copyright header in every new `.ts` file (§12.1, §12.2).
11. Full-tag JSDoc on every method and function, with every error it can surface in `@throws` (§12.5).
12. No type assertion without the user's explicit consent (§12.6).
13. A change is done only when the §13.2 checks pass.

---

## 4. Dependency injection

### 4.1 Default-export every auto-registered class

**Rule:** A class in a file matching one of these globs must end with `export default ClassName;`. It is registered
under its camelCased file name (`role.service.ts` → `roleService`), which equals the camelCased class name when the
file is named after its class (§12.4).
**Why:** `service.container.ts` auto-registers the default export of every matching file.

| Glob (under `src/`)                                                   | Process      | Example → token                                         |
| --------------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `application/services/**/*.service.ts`                                | API + worker | `SignupApplicationService` → `signupApplicationService` |
| `domain/**/service/*.service.ts`                                      | API + worker | `RoleService` → `roleService`                           |
| `infrastructure/persistance/database/repositories/**/*.repository.ts` | API + worker | `RoleRepository` → `roleRepository`                     |
| `presentation/http/controllers/**/*.controller.ts`                    | API only     | `RoleController` → `roleController`                     |
| `application/workers/**/*.worker.ts`                                  | Worker only  | `EmailWorker` → `emailWorker`                           |

**Use cases:**

- a worker → also implement `IWorker`; `InfiniteNodeWorker` starts every registration whose name ends in `Worker` (§11.5)
- app metadata → `appMetadata` (`IAppMetadata`: name, version, url, port, environment) is registered by both processes

### 4.2 Name constructor parameters after DI tokens

**Rule:** Every constructor parameter of a DI-built class is named exactly like the token it receives.
**Why:** CLASSIC injection resolves by parameter name; a typo fails at resolve time, not compile time.
**Use cases:**

- infrastructure services → `database_mapper`, `cache`, `logger`, `queue`, `emailService`, `storage`,
  `pushNotification`, `socket`, `httpClient` (§11)
- an application service → `database_mapper` first (§8.1)
- a controller → `logger` for `BaseController` (§9.2)

### 4.3 Never let a class name collide with an infrastructure token

**Rule:** Don't name a domain or application class so that its camelCase token equals an infrastructure token.
**Why:** The auto-registered class would replace the infrastructure service in DI.
**Use cases:**

- a domain service for the email log → `EmailLogService`, never `EmailService` (`emailService` is the
  infrastructure email service)

---

## 12. Conventions

### 12.1 Start every new `.ts` file with the copyright header

**Rule:** Use the current year in new files; never change the year of an existing header.

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */
```

### 12.2 Import with `@/`, in the lint order

**Rule:** Import intra-service code through `@/` (→ `src/`); use relative paths only for siblings and parents inside
one feature folder. Type-only imports use `import type`. Groups, each separated by a blank line: Node built-ins →
npm packages → `@/` paths → relative paths → type imports from npm packages or relative paths.
**Why:** `import/order` and `consistent-type-imports` fail the lint otherwise.

```typescript
import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';
```

### 12.3 Keep `npm run lint` clean

**Rule:** These rules fail the lint (levels as they actually apply, from `npx eslint --print-config src/index.ts`):

| Rule                                               | Level | Requirement                                                               |
| -------------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| `@typescript-eslint/explicit-function-return-type` | error | Every function and method declares its return type                        |
| `@typescript-eslint/consistent-type-imports`       | error | `import type` for type-only imports                                       |
| `@typescript-eslint/return-await`                  | error | `return await` a promise inside `try`, or its rejection skips the `catch` |
| `@typescript-eslint/no-unused-vars`                | warn  | Prefix an unused parameter with `_`                                       |
| `@typescript-eslint/no-explicit-any`               | warn  | Use precise types or `unknown`                                            |
| `@typescript-eslint/no-empty-object-type`          | error | No empty interface: use a type alias (§6.4)                               |
| `import/order`                                     | error | §12.2                                                                     |
| `prettier/prettier`                                | error | 120 columns, 2 spaces, single quotes, semicolons, trailing commas, LF     |
| `jsdoc/require-jsdoc`                              | error | A JSDoc block on every function, method, interface method and exported arrow function; getters, setters and constructors exempt (§12.5) |
| `jsdoc/require-description`                        | error | A summary in every block                                                  |
| `jsdoc/require-param`, `check-param-names`, `require-param-type`, `require-param-description` | error | One `@param {Type} name - description` per parameter, in declared order |
| `jsdoc/require-returns`, `require-returns-type`    | error | `@returns {Type}` on every function, including `void` and `Promise<void>` |
| `jsdoc/require-throws`, `require-throws-type`      | error | `@throws {Type}` for a `throw` in a synchronous function's own body       |
| `jsdoc/check-tag-names`, `valid-types`             | error | Known tags only (`@returns`, not `@return`; `@extends`, not `@augments`), valid types |
| `jsdoc/sort-tags`, `tag-lines`                     | error | `@param` → `@returns` → `@throws`; one blank line between the summary and the first tag |
| `no-console`                                       | warn  | Log through the injected `logger` (`ILogger`); off for the seeders (§16)  |

`eslint.config.mjs` lists the recommended presets (`@eslint/js`, `typescript-eslint`) first, so the project's levels
override theirs; `no-empty-object-type` comes from the `typescript-eslint` preset. The `jsdoc/*` rules apply to
`src/**/*.ts` except specs, and a class's `@implements` / `@extends` tag does not exempt its methods. A warning does
not fail the lint, but don't add new ones.

### 12.4 Follow the naming conventions

| Thing                  | Convention                 | Example                             |
| ---------------------- | -------------------------- | ----------------------------------- |
| Classes / type aliases | PascalCase                 | `RoleService`, `PermissionAction`   |
| Files                  | kebab-case + role suffix   | `role.service.ts`, `role.guards.ts` |
| Interfaces             | `I` + PascalCase           | `ICache`                            |
| Domain interfaces      | `INew{Model}` / `I{Model}` | `INewRole` / `IRole`                |
| Schema interface       | `INew{Model}Schema`        | `INewRoleSchema`                    |
| DI tokens              | camelCase class name       | `roleService`                       |
| Route exports          | PascalCase + `Routes`      | `AuthRoleRoutes`                    |

### 12.5 Document every method and function with a full-tag JSDoc block

**Rule:** Every method, function, interface method and exported arrow function, in every layer and including private
helpers, has a JSDoc block: a one-line imperative summary, a blank line, then `@param` (in declared order) →
`@returns` → `@throws`, each with `{Type}` braces. Exempt: getters / setters and constructors (a constructor that
throws still documents it). `npm run lint` enforces the block, the summary, the tags, their types and order (§12.3);
the completeness of `@throws` and the summary's wording are checked in review.
**Why:** The `@throws` tags are how callers learn the error types they must handle.
**Use cases:**

- a method without a value → `@returns {void}`, or `@returns {Promise<void>}` when it is async
- one `@throws` per error type the method (or an uncaught call inside it) can surface, written
  `@throws {Type} CODE when …`; omit it only when the method cannot throw (it catches and logs, or only reads a field).
  Lint checks only a `throw` written in a synchronous function's own body: errors from calls, and from async
  functions, are traced by hand
- a domain-service method inside `wrapInfrastructureErrors()` → its own `DomainServiceError` types, the ones mapped
  from the repository errors it can hit (`INVALID_ID` → `VALIDATION_ERROR` for an id it passes, `DUPLICATE_KEY` →
  `ALREADY_EXISTS` for a write to a uniquely indexed field, `VERSION_CONFLICT` → `CONFLICT` for an `update()`), and
  always `INFRASTRUCTURE_ERROR when the database fails.`
- a private domain-service helper that only runs inside a wrapper → the errors it throws itself; the repository errors
  it lets through are documented on the public method that maps them
- an application service that calls `dbTransaction()` → also `{InfrastructureError} CONNECTION_ERROR` and
  `{PersistanceError}`, which `MongooseService.transaction()` throws unwrapped (§8.3)
- a library error nothing wraps (`jsonwebtoken`, `argon2`, a client library's connect error) → `@throws {Error}`
- an interface method → the errors its implementations throw, by `InfrastructureError` type (`CACHE_ERROR`,
  `QUEUE_ERROR`, …), so callers can rely on the contract
- inline comments → only for a non-obvious _why_, never to narrate the code

```typescript
/**
 * Rotate an access/refresh token pair: expire the current session and issue a new one.
 *
 * @param {string} accessToken - The current (raw) access token.
 * @param {string} refreshToken - The current (raw) refresh token.
 * @returns {Promise<{ accessToken: string; refreshToken: string }>} The newly issued token pair.
 * @throws {DomainServiceError} AUTHENTICATION_ERROR when the token is invalid or expired.
 * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
 * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached while running or committing
 * the transaction.
 * @throws {PersistanceError} when the database otherwise fails while running, committing or aborting the
 * transaction.
 */
```

### 12.6 Never add a type assertion without the user's consent

**Rule:** Don't write `as Type`, `<Type>value` or a non-null `!` unless it is one of the pre-approved cases below or
the user agreed first. Use type guards, discriminated unions, generics or an annotated source value instead.
`as const` is not an assertion.
**Why:** An assertion silences the compiler exactly where it would catch a wrong runtime shape. No lint rule enforces
this; review does.
**Pre-approved cases:**

1. Generic base-class boundaries, e.g. `BaseMapper.toFilter` narrowing between `NewDomainModel` and `DBSchema`, or a
   generic sub-document helper narrowing `S` → `S & { _id: string }`
2. `TransactionOptions.session` (typed `unknown` to stay database-agnostic) asserted to
   `mongoose.mongo.ClientSession` in a Mongoose repository
3. Inside the body of a hand-written `is` type guard, never at its call sites
4. `req.user!` in a controller method taking `AuthenticatedRequest` (§9.3)
5. A populated `ref` field in a mapper, asserted to the known populated shape (§6.6)

```typescript
// ❌
throw new InfrastructureError(`Failed: ${(error as Error).message}`, 'CACHE_ERROR');
// ✅
throw new InfrastructureError(`Failed: ${error instanceof Error ? error.message : String(error)}`, 'CACHE_ERROR', {
  cause: error,
});
```

---

## 13. Workflow

### 13.1 New API resource

The file paths are §15.1; a later change to the domain model follows §15.2.

```
☐ 1  Domain model (§5) whose version property is read-only: a getter, no setter (§5.4) —
     src/domain/{feature}/models/
☐ 2  Schema with INew{Model}Schema only and __v?; a unique index per uniqueness rule (§6.1, §6.7)
☐ 3  Mapper extending BaseMapper; toVersion() in toDomain, never __v in toPersistence (§6.2, §6.3)
☐ 4  Repository interface in application/interfaces/repositories/ + repository extending BaseRepository (§6.4)
☐ 5  Domain service (§7); update() and delete() compare the client's version with the entity's version
     property before any write (§7.6)
☐ 6  Application service, for any operation that needs a database transaction (§8)
☐ 7  Create, update and delete validators; update accepts the client's version in the body, delete in the
     query (§9.1, §9.3)
☐ 8  Controller (§9.2–§9.4)
☐ 9  Routes, mounted in routes/index.ts (§9.5, §9.6 when role-limited)
☐ 10 A seeded resource when the route needs permissions (§9.6); a seeder for default data (§16)
☐ 11 New or changed indexes: npm run db:indexes:check, then npm run db:indexes (§6.7)
☐ 12 JSDoc (§12.5) and the §13.2 checks
```

### 13.2 Definition of done

A change is done only when all four hold:

1. **Logic correct:** it does what was asked and follows every rule in this file and in the rule files for what it
   touched.
2. **JSDoc** present and correct (§12.5): the `jsdoc/*` lint rules pass, and every `@throws` list is complete.
3. **No lint errors:** `npm run lint` is clean (`npm run lint:fix` / `npm run format` fix most).
4. **No type errors:** `npx tsc --noEmit` passes and `npm run build` succeeds.

Run `npm test` too; a pull request records all of these.

### 13.4 New infrastructure service

Follow "Checklist: a new infrastructure service" at the end of `Docs/architecture/infrastructure-layer-pattern.md`.
Its cards expand the binding rules in §11, and where the two disagree, §11 wins. A new driver for an existing service
(another email provider, say) is card 14 in the same file. Email or push notifications: also `Docs/features/email.md`
or `Docs/features/notification.md`.

### 13.5 Change the application core (`InfiniteNodeApplication`)

This covers the entry points (`src/index.ts`, `src/worker.ts`) and `src/app/`: `InfiniteNodeApplication`
(`app.ts`), `InfiniteNodeWorker` (`worker.ts`) and `core/` (DI container, config, middleware, shutdown, telemetry,
utils). Before you change them, read these sections of `Docs/architecture/application-architecture.md`:

| Before you change                                                 | Read section of `application-architecture.md`   |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| `core/service.container.ts` or the auto-registration globs (§4.1) | 4. How the DI container is composed             |
| `app.ts`, `src/index.ts`, `core/middleware/`, `core/shutdown/`    | 5. The API process (boot order, shutdown hooks) |
| `app/worker.ts`, `src/worker.ts`                                  | 6. The worker process                           |
| `core/config/`, `core/telemetry/`, logging or health              | 11. Cross-cutting concerns                      |

Both entry points keep `load-env` and `telemetry/instrumentation` as their first two imports (§2).
