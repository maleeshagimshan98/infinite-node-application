# Infinite Node Application — CLAUDE.md

This file is the single source of the rules, structure and patterns for **every** AI agent working in this
repository (Claude, Codex, Copilot, Cursor, …). `AGENTS.md` only points here. When existing code disagrees with this
file, follow this file and tell the user about the mismatch. Each rule is a card: **Rule** (what to check), **Why**,
**Use cases**, an example where the code shape matters, and a **Reference** file to copy from.

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
| `Docs/architecture/infrastructure-layer-pattern.md`       | Infrastructure services, bootstrap and shutdown in depth             |
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
│   ├── services/{feature}/      # Application services (multi-service transactions)
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

1. Follow every pattern here exactly; don't "improve" or deviate without the user's approval.
2. Imports point inward (§2.1).
3. Every auto-registered class ends with `export default ClassName;` (§4.1).
4. A schema file exports one root interface, `INew{Model}Schema` (§6.1).
5. Every uniqueness rule has a unique index, and every update is a conditional write on the entity's `version`
   (§6.7, §6.8, §7.6).
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
under its camelCase class name.
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

## 5. Domain models

### 5.1 Use the four-part model pattern

**Rule:** A model file in `src/domain/{feature}/models/{model}.ts` exports `INew{Model}` (`id?`), `I{Model}` (`id`
required), `New{Model} extends DomainEntity` and `{Model} extends New{Model}`, with `export default {Model};`. Fields
are `protected _field`, exposed through getters; add setters only where mutation is needed.
**Why:** `New{Model}` is an entity not stored yet, `{Model}` one that has an id. `DomainEntity.toJSON()` serializes
every getter and strips the `_` prefix.

```typescript
export interface INewResource {
  id?: string;
  version?: number; // in an update payload: the version the client read (§5.4)
  name: string;
  description?: string;
}
export interface IResource extends INewResource {
  id: string;
  version: number;
}

export class NewResource extends DomainEntity {
  protected _id?: string;
  protected _version?: number;
  protected _name: string;
  protected _description: string | undefined;

  constructor(data: INewResource) {
    super();
    if (data.id) this._id = data.id;
    if (data.version !== undefined) this._version = NewResource.checkVersion(data.version);
    this._name = data.name;
    if (data.description !== undefined) this._description = data.description;
  }
  get id(): string | undefined {
    return this._id;
  }
  get version(): number | undefined {
    return this._version;
  }
  get name(): string {
    return this._name;
  }
  set name(value: string) {
    this._name = value;
  }
}

export class Resource extends NewResource {
  protected _id: string;
  protected _version: number;
  constructor(data: IResource) {
    super(data);
    // Redeclared fields are reset after super() returns (ESNext class fields), so assign them again.
    this._id = data.id;
    this._version = Resource.checkVersion(data.version);
  }
  get id(): string {
    return this._id;
  }
  get version(): number {
    return this._version;
  }
}
export default Resource;
```

**Reference:** `src/domain/auth/models/resource.ts`; nested data: `role.ts`

### 5.2 Throw `DomainEntityError` for invariant violations

**Rule:** A constructor or setter that receives an invalid value throws `DomainEntityError`, never
`DomainServiceError` or `Error`.
**Why:** The model guards its own invariants; `DomainEntityError` becomes a 400 with its message (§10).
**Use cases:**

- an invalid value or state move inside one entity (e.g. `Email.markSent()` on a non-pending email) →
  `DomainEntityError` in the model
- a rule that needs other records (uniqueness, references) → `DomainServiceError` in the domain service (§7.3)

**Reference:** `src/domain/app/email/models/email.ts`

### 5.3 Write type guards as `is` predicates only

**Rule:** Add `src/domain/{feature}/models/guards/{model}.guards.ts` only when TypeScript narrowing is needed (e.g.
`INew{Model}` → `I{Model}`, a discriminated union). It holds `value is T` functions only: no business logic, no
infrastructure imports.

```typescript
export function isResource(value: INewResource): value is IResource {
  return typeof value.id === 'string';
}
```

### 5.4 Give every root entity a read-only `version`

**Rule:** Every root entity has `version?` on `INew{Model}` and `version` on `I{Model}`, a `_version` field with a
getter and **no setter**, validated with `DomainEntity.checkVersion()` in both constructors (§5.1).
**Why:** `version` is Mongoose's `__v`; only `BaseRepository.update()` advances it, and the conditional update (§6.8)
relies on it to reject stale writes.
**Use cases:**

- a value that is not an integer ≥ 0 → `checkVersion()` throws `DomainEntityError`, so an `{Model}` built from
  untyped JSON without a version fails
- a sub-document → has no version of its own; changing it bumps its root's version. A User's version doesn't change
  when its populated Role changes
- `Object.assign(entity, data)` with `version` in `data` → throws `TypeError` (no setter); destructure it first (§7.6)

**Reference:** `src/domain/auth/models/resource.ts`, `src/domain/base/DomainEntity.ts`

### 5.5 Store emails normalized

**Rule:** An entity normalizes an email with `normalizeEmail()` (`src/domain/base/normalize-email.ts`: trimmed,
lowercase) in its constructor and setter, and services normalize before every lookup by email.
**Why:** The unique indexes on email fields (§6.7) compare stored values; `John@x.com` and `john@x.com` would
otherwise be two users. The schema paths also declare `lowercase: true, trim: true`.

---

## 6. Persistence (schema, mapper, repository)

Files live in `src/infrastructure/persistance/database/repositories/mongoose/{feature}/`: `{name}.model.ts`,
`{name}.mapper.ts`, `{name}.repository.ts`. Full guide: `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`.

### 6.1 Export one root interface per schema file

**Rule:** A schema file exports only `INew{Model}Schema` (with `_id?: Types.ObjectId` and, for a root document,
`__v?: number`), the schema (`{ timestamps: true }`, plus its indexes, §6.7) and the model. Never add
`I{Model}Schema extends INew{Model}Schema` or an `I{Model}` here.
**Why:** The mapper narrows `_id` with an intersection type (§6.2); a second root interface drifts from the first.
**Use cases:**

- a nested value object (e.g. `IPermissionSchema` inside a role) → allowed, as a field type of `INew{Model}Schema`
- a reference to another collection → `Types.ObjectId` with `ref` (populate rules: §6.6)

```typescript
export interface INewResourceSchema {
  _id?: Types.ObjectId;
  __v?: number; // 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  name: string;
  description?: string;
}
export const ResourceSchema = new Schema<INewResourceSchema>(
  { name: { type: String, required: true } },
  { timestamps: true },
);
ResourceSchema.index({ name: 1 }, { unique: true });
export const ResourceModel = model<INewResourceSchema>('resource', ResourceSchema);
```

**Reference:** `.../mongoose/resources/resource.model.ts`

### 6.2 Map `_id` explicitly in both directions

**Rule:** `toDomain(data: INew{Model}Schema & { _id: Types.ObjectId })` returns the model with
`id: data._id.toString()` and `version: this.toVersion(data.__v, data._id)`. `toPersistence()` omits `_id` when
`data.id` is falsy and otherwise sets `_id: new Types.ObjectId(data.id)` (a value import:
`import { Types } from 'mongoose'`). It never writes `__v`.
**Why:** The schema's `_id` is an optional ObjectId; a raw string or a missing `.toString()` breaks queries and
equality checks. A `$set.__v` next to the repository's `$inc.__v` makes MongoDB reject the update.
**Use cases:**

- an optional field under `exactOptionalPropertyTypes` → spread it only when defined:
  `...(data.description !== undefined && { description: data.description })`
- a malformed id → `new Types.ObjectId()` throws, and the repository turns it into `INVALID_ID` (§6.5)
- a stored document without `__v` → `toVersion()` throws `PersistanceError`; `npm run db:indexes` backfills it (§6.7)

```typescript
export class ResourceMapper extends BaseMapper<INewResourceSchema, Resource, NewResource> {
  toDomain(data: INewResourceSchema & { _id: Types.ObjectId }): Resource {
    return new Resource({ id: data._id.toString(), version: this.toVersion(data.__v, data._id), name: data.name });
  }
  toPersistence(data: NewResource): INewResourceSchema {
    const base = { name: data.name };
    return !data.id ? base : { ...base, _id: new Types.ObjectId(data.id) };
  }
}
```

**Reference:** `.../mongoose/resources/resource.mapper.ts`

### 6.3 Extend the base mapper; never override `toFilter()`

**Rule:** A root-document mapper extends `BaseMapper<DBSchema, Model, NewModel>`; a sub-document mapper extends
`BaseSubDocumentMapper` (its `toDomain(data: DBSchema)` has no `_id` intersection). Neither implements
`IBaseMapper` directly or overrides the inherited `toFilter()`.
**Why:** Repositories rely on the inherited `toFilter()` to turn domain filters into queries.
**Use cases:**

- an array of sub-documents → see §Sub-Documents in `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`;
  nothing extends `BaseSubDocumentMapper` yet

### 6.4 Extend `BaseRepository` and depend on its interface

**Rule:** A repository extends `BaseRepository<Schema, Model, NewModel>`, implements `I{Model}Repository` from
`src/application/interfaces/repositories/{feature}/`, and adds only domain-specific queries. Domain services and
controllers inject the interface, never the class.
**Why:** `BaseRepository` already provides `create`, `bulkCreate`, `findById`, `findOne`, `find`, `count`, `update`
and `delete`, each with an optional `TransactionOptions` last; duplicating them splits the error handling.
**Use cases:**

- the interface with no custom queries → a type alias, `export type I{Model}Repository = IBaseRepository<{Model}, New{Model}>`
  (`INotificationRepository`); an empty `interface … extends IBaseRepository<…> {}` fails `no-empty-object-type` (§12.3).
  With custom queries → an interface that extends it (`IEmailRepository`)
- nothing found → the repository returns `null`; the domain service throws `NOT_FOUND` (§7.2)
- an update → `update(id, item)` takes the domain model you read and changed, and is a conditional write (§6.8)
- a query the base can't express (sorting, aggregation) → add a method to the interface and the class, inside
  `wrapDatabaseErrors()` (§6.5)

```typescript
export class ResourceRepository
  extends BaseRepository<INewResourceSchema, Resource, NewResource>
  implements IResourceRepository
{
  constructor() {
    super(ResourceModel, new ResourceMapper());
  }
}
export default ResourceRepository;
```

**Reference:** `.../mongoose/resources/resource.repository.ts`; with a custom query: `.../email/email.repository.ts`

### 6.5 Run custom queries inside `wrapDatabaseErrors()`

**Rule:** A custom repository method runs inside `this.wrapDatabaseErrors('methodName', async () => { ... })`,
mapper calls included, unless it only calls the inherited methods.
**Why:** It classifies whatever is thrown, in this order, and keeps the original in `data.cause`:

| Thrown inside                                                                                | Repository throws                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `MongoError` labelled `TransientTransactionError` / `UnknownTransactionCommitResult`         | The same error, so `withTransaction` can retry |
| Malformed ObjectId (Mongoose `CastError` with `kind: 'ObjectId'`, or a mapper's `BSONError`) | `RepositoryError` `INVALID_ID`                 |
| Anything that is not a Mongoose / MongoDB / BSON error (e.g. a mapper's `DomainEntityError`) | The same error                                 |
| Unique index violation (E11000)                                                              | `RepositoryError` `DUPLICATE_KEY`              |
| Network / server-selection / closed-client error, or any driver error while disconnected     | `InfrastructureError` `CONNECTION_ERROR` (503) |
| Any other Mongoose / MongoDB error                                                           | `PersistanceError` (`DATABASE_ERROR`, 500)     |

**Use cases:**

- `RepositoryError` (`@/application/interfaces/errors/repository.error`) means the caller's data was rejected, so it does
  not extend `InfrastructureError`; `wrapInfrastructureErrors()` maps it (§10). Its message is for the logs only.

### 6.6 Populate at most two levels deep

**Rule:** Override `protected populateOptions(): (string | PopulateOptions)[]` to populate `ref` fields, at most two
levels from the root document. Never nest a `populate` inside an already nested one.
**Why:** Deep populate chains multiply query cost and fan out without bound on self-referencing schemas.
**Use cases:**

- one level → `RoleRepository`: `['resource_permissions.resource_id']`
- two levels → `UserRepository`: `[{ path: 'role_id', populate: { path: 'resource_permissions.resource_id' } }]`
- a third level → fetch it with a separate repository call in the domain service and attach it before building the
  returned model
- the mapper of a populated field asserts the populated shape (pre-approved, §12.6)

### 6.7 Back every uniqueness rule with a unique index

**Rule:** Every uniqueness rule a domain service checks has a unique index, declared with `schema.index()` (never
`unique: true` on the field), partial when the rule is conditional. Keep the service's `findOne` pre-check for its
specific message.
**Why:** Only the index stops two concurrent requests that both pass the pre-check from both inserting. The loser
gets `DUPLICATE_KEY` → `ALREADY_EXISTS` (400).
**Use cases:**

- a conditional rule ("one default role") → `RoleSchema.index({ default: 1 }, { unique: true, partialFilterExpression: { default: true } })`;
  switching the flag must unset the old default first
- the current unique indexes → `users.email`, `roles.name`, `roles.default` (partial), `resources.name`,
  `user-groups.name`, `user-groups.default` (partial), `email_verification_codes.email` (partial,
  `status: 'pending'`), `password_reset_codes.email` (partial, `status: 'active'`), `login_records.token`
- after adding or changing an index → `npm run db:indexes:check` (audits only, changes nothing), then
  `npm run db:indexes`. It changes nothing when it finds duplicates (exit 1; email paths compare normalized, §5.5);
  otherwise it normalizes the stored emails it reported, backfills `__v: 0` and builds missing indexes. It never
  drops one: an index the schema no longer declares is listed for a reviewed manual drop
- production → `MONGODB_AUTO_INDEX` (Mongoose's `autoIndex`, default `true`) is `false`; `db:indexes:prod` runs as a
  one-off task before each rollout (the `db-indexes` service in Docker Compose, before `seed`), because an index
  build that fails at startup is only an unheard `index` event
- a test that relies on an index → `await XModel.init()` in `beforeAll`; a database-backed spec file passes its own
  database name to `connectToTestDB()`, because Jest runs files in parallel and `clearTestDB()` empties every
  collection

### 6.8 Update with the version you read

**Rule:** `BaseRepository.update(id, item: DomainModel)` writes
`findOneAndUpdate({ _id, __v: item.version }, { $set, $inc: { __v: 1 } })`. Always pass an entity you read and
changed, never a `New{Model}` built from a payload: `$set` writes every field of `item`.
**Why:** The write succeeds only if nobody changed the document since it was read, so concurrent updates can't
silently overwrite each other.
**Use cases:**

- success → the entity at its new version; an unknown id → `null`
- a root model → `IBaseRepository<DomainModel extends IVersionedEntity, …>` accepts only a model with a `version`
  (§5.4), so a repository for a model without one doesn't compile
- the stored version moved on → `RepositoryError` `VERSION_CONFLICT` → `DomainServiceError` `CONFLICT` (409, §10)
- inside a transaction → a concurrent commit raises a `WriteConflict` labelled `TransientTransactionError`, and
  `withTransaction` re-runs the callback with the fresh version: a client-supplied version then fails
  `assertVersion()` with `CONFLICT`, an internal flow succeeds
- deletes → `delete(id)` doesn't check the version yet (§14)

---

## 7. Domain services

File: `src/domain/{feature}/service/{name}.service.ts`, `export default`.

### 7.1 Extend `BaseDomainService` and wrap every public method

**Rule:** Every public async method returns `this.wrapInfrastructureErrors(async () => { ... })`.
**Why:** It turns an `InfrastructureError` into `DomainServiceError` `INFRASTRUCTURE_ERROR` and a `RepositoryError`
into a client-safe `DomainServiceError` (§10), so controllers see one error type.
**Use cases:**

- signature: `wrapInfrastructureErrors<T>(fn: () => Promise<T>, onError?: (error: InfrastructureError) => Promise<void> | void): Promise<T>`
- per-call logging or alerting of an infrastructure failure → pass `onError`; it runs before the error is rethrown

```typescript
export class ResourceService extends BaseDomainService {
  constructor(private readonly resourceRepository: IResourceRepository) {
    super();
  }

  async create(data: INewResource, transactionOptions?: TransactionOptions): Promise<Resource> {
    return this.wrapInfrastructureErrors(async () => {
      const existing = await this.resourceRepository.findOne({ name: data.name }, undefined, transactionOptions);
      if (existing) throw new DomainServiceError(`Resource ${data.name} already exists`, 'ALREADY_EXISTS');
      return await this.resourceRepository.create(new NewResource(data), transactionOptions);
    });
  }
}
export default ResourceService;
```

**Reference:** `src/domain/auth/service/resource.service.ts`, `role.service.ts`

### 7.2 Check existence after every lookup

**Rule:** After `findById` / `findOne`, throw `DomainServiceError('…', 'NOT_FOUND')` when the result is `null`.
**Why:** Repositories return `null`; the domain service owns the error and the 404.
**Use cases:**

- get by id → throw `NOT_FOUND`
- update or delete → call `getById()` first; then null-check the repository's `update()` / `delete()` result and
  throw `NOT_FOUND` again, because it returns `null` when nothing matched
- uniqueness lookup → `null` is the good case; a hit throws `ALREADY_EXISTS` (§7.3)

```typescript
// ✅
if (!resource) throw new DomainServiceError(`Resource ${id} not found`, 'NOT_FOUND');
// ❌ leaks null to the controller
return this.resourceRepository.findById(id);
```

### 7.3 Throw only `DomainServiceError`, with the type callers rely on

**Rule:** A domain service throws only `DomainServiceError`. A duplicate unique value (name, email, number) is
`'ALREADY_EXISTS'`, and the rule needs a unique index (§6.7); a stale version is `'CONFLICT'` (§7.6); any other rule
violation is `'VALIDATION_ERROR'` (or `'INVALID_OPERATION'` for a forbidden state change).
**Why:** Controllers map the type to the HTTP status (§10), and callers such as the seeders branch on the type,
never on the message.

### 7.4 Return the deleted entity from `delete()`

**Rule:** `delete()` returns the deleted domain object, never `void`, after the two `NOT_FOUND` checks of §7.2.
**Why:** Callers and the API response show what was removed.

### 7.5 Accept `TransactionOptions` and pass it down

**Rule:** Every read or write method that can run in a transaction takes `transactionOptions?: TransactionOptions` as
its last parameter and passes it to every repository and domain-service call it makes.
**Why:** One missed call runs outside the session and breaks the transaction's atomicity.

### 7.6 Check the version before any side effect in `update()`

**Rule:** `update(id, data)` takes `version` out of the payload, reads the entity, calls
`this.assertVersion(entity, version, '{Model}')` before any other check or write, then applies the changes and calls
the repository's `update()` (§6.8).
**Why:** A stale version fails fast with `CONFLICT` before anything changes; the conditional write then makes the
check atomic.
**Use cases:**

- `version` is `undefined` → the check is skipped, for internal callers writing with the version they just read
- a client update → its validator requires `version` (§9.1), so the check always runs

```typescript
async update(id: string, data: Partial<INewResource>, transactionOptions?: TransactionOptions): Promise<Resource> {
  return this.wrapInfrastructureErrors(async () => {
    const { version, ...changes } = data; // no setter for version: Object.assign() would throw
    const resource = await this.getById(id, transactionOptions);
    this.assertVersion(resource, version, 'Resource');
    Object.assign(resource, changes);
    const updated = await this.resourceRepository.update(id, resource, transactionOptions);
    if (!updated) throw new DomainServiceError(`Resource ${id} not found`, 'NOT_FOUND');
    return updated;
  });
}
```

**Reference:** `src/domain/auth/service/resource.service.ts`

---

## 8. Application services and transactions

File: `src/application/services/{feature}/{name}.application.service.ts`, `export default`.

### 8.1 Use an application service only for a multi-service transaction

**Rule:** Create one only when an operation spans several domain services in one transaction. It extends
`BaseApplicationService`, and its first constructor parameter is `database_mapper: IDatabaseMapper`, passed to
`super(database_mapper)`.
**Why:** Single-service operations belong in the domain service; the parameter name is the DI token (§4.2).
**Reference:** `src/application/services/auth/signup.application.service.ts`

### 8.2 Run the work in `dbTransaction()` and pass `{ session }` everywhere

**Rule:** Wrap transactional work in `this.dbTransaction(async ({ session }) => { ... })` and pass `{ session }` to
every domain-service call inside it.

```typescript
const user = await this.dbTransaction(async ({ session }) => {
  const role = await this.roleService.getDefaultRole({ session });
  if (!role) throw new DomainServiceError('No default role is available', 'UNKNOWN_ERROR');
  return await this.userService.create({ ...data, role_id: role.id }, { session });
});
```

### 8.3 Never catch or re-wrap database errors inside the callback

**Rule:** Let errors leave the callback unchanged.
**Why:** `withTransaction` retries the callback only while a raw `MongoError` labelled `TransientTransactionError`
escapes it, and `BaseRepository` already rethrows those unchanged (§6.5).
**Use cases:**

- a `DomainServiceError` thrown inside → propagates unchanged, with its type and HTTP status
- a driver failure that escapes the callback (commit failure, no replica set, lost connection) →
  `MongooseService.transaction()` turns it into `InfrastructureError` `CONNECTION_ERROR` when the database can't be
  reached, otherwise `PersistanceError`

---

## 9. Presentation (validators, controllers, routes)

### 9.1 Validate requests only in validators

**Rule:** Request validation lives in `src/presentation/http/validators/{feature}/{name}.validator.ts` as functions
returning an express-validator `Schema`, with separate create and update validators. Never validate in controllers
or domain services.

```typescript
export const newResourceValidator = (): Schema => ({
  name: { notEmpty: true, isString: true, errorMessage: 'Resource name is required' },
  description: { optional: true, isString: true },
});
```

**Use cases:**

- an update validator for a root entity → requires the version the client read (§7.6):
  `version: { isInt: { options: { min: 0 } }, toInt: true, errorMessage: 'version is required: …' }`

**Reference:** `src/presentation/http/validators/auth/role.validator.ts`

### 9.2 Run all controller logic inside `catchExceptionsWrapper()`

**Rule:** A controller extends `BaseController`, takes `logger: ILogger` last and passes it to `super(logger)`. Every
method builds its response inside `this.catchExceptionsWrapper()` and sends it with
`ApiResponseUtils.createResponse(response, res)`.
**Why:** The wrapper maps every error to its status (§10) and logs it with the request's `trace_id`: a 5xx as an
error with its stack, anything else as a warning.

```typescript
export class RoleController extends BaseController {
  constructor(
    private roleService: RoleService,
    private roleRepository: IRoleRepository, // for count()
    logger: ILogger,
  ) {
    super(logger);
  }

  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewRole>(req);
      const result = await this.roleService.create(data);
      return ApiResponseUtils.apiOkResponse(201, false, null, 'Role created successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}
export default RoleController;
```

**Reference:** `src/presentation/http/controllers/auth/role.controller.ts`

### 9.3 Read input with `matchedData()` and answer with `ApiResponseUtils`

**Rule:** Read the body and query only through `matchedData<T>(req)`, never `req.body`. Build every response with
`ApiResponseUtils`, never by hand.
**Use cases:**

- a route parameter → `this.getStringParam(req, 'id')` (a missing one is a 400)
- a paginated list → `count({})` on the injected repository, `this.getPaginator(req, totalCount)`, then the service
  with `paginator.getResultsPerPage()` / `getOffset()`, and `apiOkResponse(200, true, paginator, …)`
- response headers (`Retry-After`, `WWW-Authenticate`) → the fourth argument of
  `apiErrorResponse(code, message, data?, headers?)`; `createResponse()` applies them, never call `res.setHeader()`
- the authenticated user → `req.user!` in a method taking `AuthenticatedRequest` (pre-approved, §12.6)
- a response built by hand (e.g. `UserController.toSafeUser()`, `EmailLogController.toSafeEmail()`) → include
  `version`, so the client can send it back on update

### 9.4 Never put an infrastructure error's message in a response

**Rule:** Never send an `InfrastructureError`'s message (or its `data`) to the client.
**Why:** It can carry driver internals: hosts, collection and index names, duplicate key values.
**Use cases:**

- `catchExceptionsWrapper()` already answers every infrastructure failure with a generic message
  (`ApiResponseUtils.infrastructureErrorResponse()`) and logs the full error; don't catch it yourself
- a stored field holds a raw provider error (e.g. an email's `error_message`) → drop it from the response

### 9.5 Authenticate every non-public route

**Rule:** Every route starts with `UserValidatorMiddleware(loginApplicationServiceProvider)`, then
`RequestValidatorMiddleware(validator())` on create and update routes. The handler resolves the controller from the
container inside the handler. The file exports `export { router as {Feature}Routes };`, mounted in
`src/presentation/http/routes/index.ts`.
**Why:** Authentication is opt-out per route, so a missing middleware silently makes the route public.
**Use cases:**

- the public routes are only `/health` (`/`, `/live`, `/ready`) and, in `auth.routes.ts`, `/validate` (the Nginx
  `auth_request` endpoint, which checks the token itself), `/login`, `/refresh`, `/forgot-password`,
  `/reset-password`, `/register`, `/verify-email` and `/resend-verification-email`
- a new public route → ask the user first

```typescript
router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(newRoleValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<RoleController>('roleController').create(req, res);
  },
);
export { router as AuthRoleRoutes };
```

**Reference:** `src/presentation/http/routes/auth-role.routes.ts`

### 9.6 Guard role-limited routes with `PermissionMiddleware`

**Rule:** A route limited to some roles adds `PermissionMiddleware(resourceName, action)` right after
`UserValidatorMiddleware`. `action` is a `PermissionAction`: `'read' | 'write' | 'update' | 'delete'`.
**Why:** It answers 403 unless the user's role grants `action` on the Resource named `resourceName`. It reads
`req.user`, loaded with its role and the role's resources, so it costs no query. It fails closed: no user, no loaded
role or no loaded resources is a refusal (`User.hasPermission()` → `Role.hasPermission()`).
**Use cases:**

- a new protected resource → export its name as a constant from the feature's domain model (e.g.
  `EMAIL_LOG_RESOURCE_NAME` in `email.ts`) and add it to `resource.seeder.ts`, so a fresh seed grants it to
  `Administrator`
- an already seeded database (the seeders skip it) → create the resource (`POST /auth/resources`) and grant it to a
  role (`PUT /auth/roles/:id` with the role's full `resource_permissions`)

**Reference:** `src/presentation/http/middleware/PermissionMiddleware.ts`, `src/presentation/http/routes/email-log.routes.ts`

---

## 10. Errors → HTTP status

`BaseController.catchExceptionsWrapper()` turns every error into a response:

| Thrown error                                                      | HTTP                                                        | Response message                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| `PaginationException`, `RouteParamException`, `DomainEntityError` | 400                                                         | The error's message               |
| `DomainServiceError`                                              | Per type, below                                             | The error's message, except below |
| `InfrastructureError` (reached the controller unwrapped)          | 503 for `NETWORK_ERROR` / `CONNECTION_ERROR`, otherwise 500 | Generic                           |
| Anything else (including an unwrapped `RepositoryError`)          | 500                                                         | Generic                           |

| `DomainServiceError` type | HTTP                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `AUTHENTICATION_ERROR`    | 401                                                                                           |
| `USER_PERMISSION_ERROR`   | 403                                                                                           |
| `NOT_FOUND`               | 404                                                                                           |
| `ALREADY_EXISTS`          | 400                                                                                           |
| `CONFLICT`                | 409: the record changed since the client read it (§7.6)                                       |
| `VALIDATION_ERROR`        | 400 (response includes `data`)                                                                |
| `INVALID_OPERATION`       | 400 (response includes `data`)                                                                |
| `INCOMPLETE_MODEL`        | 400                                                                                           |
| `UNKNOWN_ERROR`           | 500 (response includes `data`)                                                                |
| `INFRASTRUCTURE_ERROR`    | 503 when `data.type` is `NETWORK_ERROR` / `CONNECTION_ERROR`, otherwise 500 — generic message |

- "Generic" is `ErrorResponseMessages.SERVER_ERROR()` (500) or `SERVICE_UNAVAILABLE()` (503); the full error is logged.
- `wrapInfrastructureErrors()` maps a `RepositoryError` first, with a fixed client-safe message and without calling
  `onError`: `DUPLICATE_KEY` → `ALREADY_EXISTS`, `INVALID_ID` → `VALIDATION_ERROR`, `VERSION_CONFLICT` → `CONFLICT`
  ("The record was changed by another request. Reload it and try again.").
- `InfrastructureErrorType`s (`DATABASE_ERROR`, `NETWORK_ERROR`, `CONNECTION_ERROR`, `CACHE_ERROR`, `QUEUE_ERROR`,
  `SOCKET_ERROR`, `EMAIL_ERROR`, `STORAGE_ERROR`, `NOTIFICATION_ERROR`, `DRIVER_ERROR`) are not `DomainServiceError`
  types; the original travels in `data.type`.
- `UserValidatorMiddleware` answers an `INFRASTRUCTURE_ERROR` during authentication with the same generic 503/500 (an
  outage is not an authentication failure); any other `DomainServiceError` there is a 401 with its message.

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
| `no-console`                                       | warn  | Log through the injected `logger` (`ILogger`)                             |

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

### 13.1 New endpoint checklist

```
☐ 1  Domain model with a read-only version (§5) — src/domain/{feature}/models/
☐ 2  Schema with INew{Model}Schema only and __v?; a unique index per uniqueness rule (§6.1, §6.7)
☐ 3  Mapper extending BaseMapper; toVersion() in toDomain, never __v in toPersistence (§6.2, §6.3)
☐ 4  Repository interface in application/interfaces/repositories/ + repository extending BaseRepository (§6.4)
☐ 5  Domain service; update() checks the version (§7)
☐ 6  Application service, only for a multi-service transaction (§8)
☐ 7  Create and update validators; update requires version (§9.1)
☐ 8  Controller (§9.2–§9.4)
☐ 9  Routes, mounted in routes/index.ts (§9.5, §9.6 when role-limited)
☐ 10 A seeded resource when the route needs permissions (§9.6)
☐ 11 New or changed indexes: npm run db:indexes:check, then npm run db:indexes (§6.7)
☐ 12 JSDoc (§12.5) and the §13.2 checks
```

### 13.2 Definition of done

A change is done only when all four hold:

1. **Logic correct:** it does what was asked and follows every rule in this file.
2. **JSDoc** present and correct (§12.5): the `jsdoc/*` lint rules pass, and every `@throws` list is complete.
3. **No lint errors:** `npm run lint` is clean (`npm run lint:fix` / `npm run format` fix most).
4. **No type errors:** `npx tsc --noEmit` passes and `npm run build` succeeds.

Run `npm test` too; a pull request records all of these.

### 13.3 Pull requests

**Rule:** Use `.github/pull_request_template.md`.

- **Base branch:** `dev` for feature and fix branches. Only a release merges `dev` into `main`, and it bumps `version`
  in `package.json`.
- **Title:** Conventional Commits, `type(scope): summary`, e.g. `feat(email): add an AWS SES email driver`.
- **Body:** `gh pr create --body` replaces the template, so write the body under its headings (Summary, Changes,
  Breaking changes, Test plan, Checklist, Notes for reviewers) and pass it with `--body-file`. Tick only the checks
  you actually ran.
- **Breaking changes:** list every changed contract (interfaces in `src/application/interfaces/`, repository or
  service signatures, error types, routes, response shapes, renamed or removed env vars), or write "None".

---

## 14. Work in progress

- **Permission checks (§9.6):** only `/app/emails` uses `PermissionMiddleware`. `/auth/roles`, `/auth/resources` and
  `/users` check login only, so any logged-in user can change role permissions.
- **Email (`Docs/features/email.md`):** SMTP and SES drivers, queued through `EmailWorker` and logged; admin reads at
  `/app/emails`. Planned: status webhook, attachments.
- **Push notifications:** sent directly through AWS SNS. No SMS driver, no queueing, no logging (notification manager
  planned).
- **Notification log:** built, not wired; no endpoints yet.
- **OpenTelemetry:** phases 1–4 built (`src/app/core/telemetry/`); 5–7 not started
  (`Docs/plans/OpenTelemetry_Implementation_Plan.md`).
- **Default role / group switch:** unique indexes allow only one default, but switching it is not one transaction: a
  failure between the two writes can leave no default.
- **Versioned deletes:** not started; `delete(id)` does not check the version (§6.8).

Planned work: `Docs/TODO.yml`.
