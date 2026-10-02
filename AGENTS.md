# Infinite Node Application — AGENTS.md

> Concise rule-set for AI agents (Claude, Copilot, Cursor, etc.) working in this repository.
> Full pattern documentation: `CLAUDE.md` in this folder and `Docs/` directory.
> Key guides (`Docs/prompts/`):
> `Domain_Model_Repository_Mapper_Guide.md` — domain models, persistence models, data-mappers incl. sub-documents ·
> `Database_Seeding_Guide.md` — database seeding.

---

## Identity

- **Platform:** Infinite Node Application — clean-architecture Node.js/TypeScript service framework for scalable, DDD-layered REST APIs
- **Owner:** Maleesha Gimshan ([@maleeshagimshan98](https://github.com/maleeshagimshan98))
- **Language:** TypeScript (strict), Node.js, Express.js

---

## Non-Negotiable Rules

1. **This guide is the source of truth.** Existing code may be outdated. When in doubt, follow the guide, not the existing code.
2. **Follow every pattern exactly.** Do not "improve", "simplify", or deviate without approval.
3. **Never create extra interfaces in infrastructure schema files.** Only `INew{Model}Schema` is allowed. (A schema file may additionally export a nested value-object interface — e.g. `IPermissionSchema` — used only as a field's type within `INew{Model}Schema`; this rule prohibits a second root-entity-shaped interface for the same collection, not a plain nested shape with no identity of its own.)
4. **Every auto-registered class must have `export default ClassName;`** at the bottom.
5. **`UserValidatorMiddleware` on every route — no exceptions.**
6. **All controller logic inside `catchExceptionsWrapper()` — no exceptions.**
7. **Use `@/` path alias** for all imports within this service.
8. **Copyright header on every new `.ts` file:**
   ```typescript
   /**
    * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
    */
   ```
9. **Full-tag JSDoc on every non-trivial method/function** (see [JSDoc Documentation](#jsdoc-documentation)). Exempt: trivial getters/setters and constructors.
10. **Never use a type assertion** (`as Type`, `<Type>value`, non-null `!`) **without the user's explicit consent** — see [Type Assertions Policy](#type-assertions-policy) for the narrow list of pre-approved structural exceptions.
11. **Infrastructure error types are for infrastructure failures only.** Wrap only the driver's own errors, rethrow caller errors unchanged, and never send an infrastructure error's message to the client — see [Infrastructure Service Checklist](#infrastructure-service-checklist-new-external-dependency) and [Error Types → HTTP Status](#error-types--http-status).

---

## Architecture in One Sentence

```
HTTP Request → Route → Controller → [ApplicationService] → DomainService → Repository → MongoDB
```

Clean architecture: **Presentation → Application → Domain → Infrastructure** (no inner layer imports outer).

---

## Layer Summary

### Presentation (`src/presentation/http/`)

- **Routes** — wire middleware + resolve controllers from DI container; export `{ router as XRoutes }`
- **Controllers** — extend `BaseController`; use `matchedData<T>(req)`, `catchExceptionsWrapper()`, `getPaginator()`, `ApiResponseUtils`
- **Validators** — express-validator `Schema` functions; separate `newX` and `updateX` validators
- **Middleware** — `UserValidatorMiddleware` (auth) and `RequestValidatorMiddleware` (body validation)

### Application (`src/application/`)

- **Interfaces** — every cross-layer contract lives here (`IDatabaseMapper`, `ICache`, `IStorage`, etc.)
- **ApplicationServices** — only for multi-domain transactions; extend `BaseApplicationService`; `databaseMapperService` MUST be first constructor param; use `this.dbTransaction()`. Errors thrown inside the callback propagate unchanged (only driver failures become `PersistanceError`); never re-wrap Mongo errors inside it — that disables the automatic retry of transient write conflicts

### Domain (`src/domain/`)

- **Models** — four-part pattern: `INewModel`, `IModel`, `NewModel extends DomainEntity`, `Model extends NewModel`
- **Services** — extend `BaseDomainService`; inject `IXxxRepository` interfaces from `application/interfaces/repositories/`; wrap with `wrapInfrastructureErrors()`; throw only `DomainServiceError`

### Infrastructure (`src/infrastructure/`)

- **Schema** — `INew{Model}Schema` only (no extending interfaces); `timestamps: true`
- **Mapper** — implements `IBaseMapper<Schema, Model, NewModel>`; `toDomain(data: INewSchema & { _id: Types.ObjectId })` — always call `.toString()` on `_id`
- **Repository** — extends `BaseRepository<Schema, Model, NewModel>`; no duplicate CRUD methods
- **External services** — Driver → Service → Factory → registered in `infrastructure.loader.ts`; wrap only the driver's own failures, keeping the original in `data.cause` (see Infrastructure Service Checklist)

---

## Domain Model Pattern

```typescript
// 1. Interfaces
export interface INewModel {
  id?: string;
  name: string; /* ... */
}
export interface IModel extends INewModel {
  id: string;
}

// 2. Classes
export class NewModel extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  constructor(data: INewModel) {
    super(); /* assign fields */
  }
  get id() {
    return this._id;
  }
  get name() {
    return this._name;
  }
}
export class Model extends NewModel {
  protected _id: string;
  constructor(data: IModel) {
    super(data);
    this._id = data.id;
  }
  get id(): string {
    return this._id;
  }
}
export default Model;
```

- Field invariant violations → `DomainEntityError` (in constructors/setters)
- Business rule violations → `DomainServiceError` (in domain services only)
- Never throw plain `Error` anywhere in the domain layer
- Type guards (optional) → `src/domain/{feature}/models/guards/{model-name}.guards.ts` — strictly TypeScript `is` predicate functions, no business logic
- Full domain-model rules (identity, naming, partial construction interfaces, sub-document decisions) → `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md` (any service)

---

## Mapper Pattern

```typescript
// base/base.mapper.ts — toFilter lives here; concrete mappers inherit it
export abstract class BaseMapper<DBSchema, DomainModel, NewDomainModel>
  implements IBaseMapper<DBSchema, DomainModel, NewDomainModel> {
  abstract toDomain(data: DBSchema & { _id: Types.ObjectId }): DomainModel;
  abstract toPersistence(data: NewDomainModel): DBSchema;

  toFilter(filter: Partial<NewDomainModel>): Partial<DBSchema> {
    const { id, ...rest } = filter as Record<string, unknown>;
    const result: Partial<DBSchema> = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Partial<DBSchema>;
    if (id !== undefined) (result as Record<string, unknown>)._id = id;
    return result;
  }
}

// Concrete mapper — extend BaseMapper, do NOT override toFilter
// ✅ Correct — intersection type, NOT a new interface
export class ModelMapper extends BaseMapper<INewModelSchema, Model, NewModel> {
  toDomain(data: INewModelSchema & { _id: Types.ObjectId }): Model {
    return new Model({ id: data._id.toString(), ... });
  }
  toPersistence(data: NewModel): INewModelSchema {
    return !data.id ? { name: data.name } : { _id: new Types.ObjectId(data.id), name: data.name };
  }
}
```

> **Exception**: the casts through `Record<string, unknown>` in `toFilter` above are pre-approved
> under the [Type Assertions Policy](#type-assertions-policy) — they bridge the generic
> `NewDomainModel`/`DBSchema` relationship at a base-class boundary TS can't verify structurally.
> Don't add further assertions elsewhere in a mapper without asking first.

- `toDomain` parameter type is always `INew{Model}Schema & { _id: Types.ObjectId }` — the intersection narrows the schema's optional `_id` to required for a hydrated read; never create a separate interface for it
- `toPersistence` omits `_id` when `data.id` is falsy; when present, convert with `new Types.ObjectId(data.id)` — the schema declares `_id?: Types.ObjectId`, so never assign the raw string
- Concrete mappers **must extend `BaseMapper`**, not implement `IBaseMapper` directly — `toFilter` is inherited and must not be overridden
- **Sub-document mappers** extend `BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel>` instead (`toDomain(data: DBSchema)` — no `_id` intersection) — see §Sub-Documents in `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`

---

## Population Strategy (Mongoose `ref` / `.populate()`)

`BaseRepository` exposes an optional, overridable hook:

```typescript
protected populateOptions(): (string | PopulateOptions)[] {
  return [];
}
```

Override it in a concrete repository to Mongoose-populate `ref`-typed schema fields — a plain string for a direct reference, including a dotted path into an array of sub-documents (e.g. `RoleRepository` → `['resource_permissions.resource_id']`), or a `PopulateOptions` object with a nested `populate` to reach one further level (e.g. `UserRepository` → `[{ path: 'role_id', populate: { path: 'resource_permissions.resource_id' } }]`, giving `User → Role → each granted Resource`). The default (`[]`) is a no-op — repositories that don't override it are unaffected.

**Hard depth limit: `.populate()` may only be used for reference chains up to 2 levels deep from the root document being fetched** (e.g. `Role → Resources` is 1 level; `User → Role → Resources` is 2 levels). Never declare a `populateOptions()` override that nests a 3rd level (a `populate` option inside an already-nested `populate` option). Deep/unbounded populate chains are a performance hazard (compounding query cost, unbounded fan-out on self-referencing or cyclic schemas) and a potential denial-of-service vector.

When a domain object genuinely needs a 3rd level of nested data, do **not** extend `.populate()` to reach it. Resolve the extra level manually in the **domain service**: fetch the root via the repository (with its own populate, up to the 2-level cap), then issue explicit, separate repository calls for the deeper data, and attach the result before constructing the returned domain object — mirroring how every other cross-aggregate reference in this codebase is already resolved (e.g. `SignupService` composing `UserGroupRepository` + `UserRepository` manually rather than relying on any ORM-level relation).

---

## Domain Service Pattern

```typescript
export class ModelService extends BaseDomainService {
  constructor(private readonly modelRepository: IModelRepository) {
    super();
  }

  async getById(id: string, opts?: TransactionOptions): Promise<Model> {
    return this.wrapInfrastructureErrors<Model>(async () => {
      const m = await this.modelRepository.findById(id, opts);
      if (!m) throw new DomainServiceError('Model not found', 'NOT_FOUND');
      return m;
    });
  }

  async delete(id: string, opts?: TransactionOptions): Promise<Model> {
    return this.wrapInfrastructureErrors<Model>(async () => {
      await this.getById(id, opts); // existence check — throws NOT_FOUND
      const deleted = await this.modelRepository.delete(id, opts);
      if (!deleted) throw new DomainServiceError('Model could not be deleted', 'NOT_FOUND');
      return deleted;
    });
  }
}
export default ModelService;
```

- Always `wrapInfrastructureErrors<T>(fn, onError?)` on every public async method
  - Full signature: `protected async wrapInfrastructureErrors<T>(fn: () => Promise<T>, onError?: (error: InfrastructureError) => Promise<void> | void): Promise<T>`
  - `onError` is optional — use it for per-call logging or alerting without altering error propagation
- Always accept `transactionOptions?: TransactionOptions` on write/transactional methods
- Always pass `transactionOptions` to repository calls
- A duplicate unique value (name, email) is `'ALREADY_EXISTS'`; `'VALIDATION_ERROR'` is for other rule violations — callers rely on the type, never on the message text
- `delete()` always returns the deleted domain object — **never `void`**. Check existence before deleting (throw `'NOT_FOUND'`), then null-check the repository's delete result too (throw `'NOT_FOUND'` again) — `BaseRepository.delete()` returns `null` if nothing matched

---

## Controller Pattern

```typescript
export class ModelController extends BaseController {
  constructor(
    private modelService: ModelService,
    private modelRepository: IModelRepository, // for count()
  ) {
    super();
  }

  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewModel>(req);
      const result = await this.modelService.create(data);
      return ApiResponseUtils.apiOkResponse(201, false, null, 'Created', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}
export default ModelController;
```

- `apiErrorResponse(code, message, data?, headers?)` takes an optional `Record<string, string>`
  of response headers (e.g. `Retry-After`) instead of calling `res.setHeader()` directly.
  `APIResponse.applyHeaders(res)` writes them onto the Express `Response`; `createResponse()`
  calls it automatically, so no extra call is needed in the controller.

---

## Routes Pattern

```typescript
const router = Router();
const loginApplicationServiceProvider = () => container.resolve<LoginApplicationService>('loginApplicationService');

router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider), // ALWAYS
  RequestValidatorMiddleware(newModelValidator()), // on create/update
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<ModelController>('modelController').create(req, res);
  },
);

export { router as ModelRoutes }; // named export ending in "Routes"
```

---

## Error Types → HTTP Status

| DomainServiceError type | HTTP                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `NOT_FOUND`             | 404                                                                                    |
| `ALREADY_EXISTS`        | 400                                                                                    |
| `MODEL_ALREADY_EXISTS`  | 400                                                                                    |
| `VALIDATION_ERROR`      | 400                                                                                    |
| `INVALID_OPERATION`     | 400                                                                                    |
| `INCOMPLETE_MODEL`      | 400                                                                                    |
| `AUTHENTICATION_ERROR`  | 401                                                                                    |
| `USER_PERMISSION_ERROR` | 403                                                                                    |
| `UNKNOWN_ERROR`         | 500                                                                                    |
| `INFRASTRUCTURE_ERROR`  | 503 if `data.type` is `NETWORK_ERROR` / `CONNECTION_ERROR`, else 500 — generic message |

- An `InfrastructureError` that reaches the controller unwrapped gets the same 503/500 mapping; any
  other unexpected error is a generic 500.
- Infrastructure failures always answer with a generic message (`SERVER_ERROR` / `SERVICE_UNAVAILABLE`)
  — never the error's own message. The full error is logged.
- `DATABASE_ERROR`, `NETWORK_ERROR`, `CACHE_ERROR` etc. are `InfrastructureErrorType`s, not
  `DomainServiceError` types.
- `UserValidatorMiddleware`: an `INFRASTRUCTURE_ERROR` during authentication is the same generic
  503/500, not a 401.

---

## DI Auto-Registration (Awilix)

| File pattern                           | Token format           |
| -------------------------------------- | ---------------------- |
| `*.service.ts` (application or domain) | `camelCase(ClassName)` |
| `*.repository.ts`                      | `camelCase(ClassName)` |
| `*.controller.ts`                      | `camelCase(ClassName)` |

`UserService` → `'userService'`, `OrderRepository` → `'orderRepository'`, etc.  
**Requires `export default ClassName;`** at the bottom of every such file.

---

## Full Endpoint Checklist

```
☐ 1. Domain model (INewModel, IModel, NewModel, Model) — domain/{feature}/models/
☐ 2. Mongoose schema (INewModelSchema ONLY) — infrastructure/.../mongoose/{feature}/
☐ 3. Mapper — toDomain uses intersection type; toFilter maps id → _id; no extra interfaces
☐ 4. Repository interface (IModelRepository) in application/interfaces/repositories/; Repository implements it; export default
☐ 5. Domain service extends BaseDomainService; inject IModelRepository (not concrete class); wrapInfrastructureErrors; TransactionOptions; export default
☐ 6. Application service (only if multi-domain transaction needed); export default
☐ 7. Validators (new + update) — presentation/http/validators/{feature}/
☐ 8. Controller extends BaseController; inject repo; catchExceptionsWrapper; matchedData; export default
☐ 9. Routes — UserValidatorMiddleware on ALL; export { router as XRoutes }
☐ 10. Register in src/presentation/http/routes/index.ts
☐ 11. JSDoc on every non-trivial method (see JSDoc Documentation)
☐ 12. Passes Evaluation Criteria: logic correct, JSDoc, no lint errors, no type errors
```

---

## Infrastructure Service Checklist (new external dependency)

```
☐ Interface in application/interfaces/ — extends IBaseInfrastructureService, literal serviceName()
☐ Driver config (extends IDriverConfig, reads env vars)
☐ Driver (implements ICoreDriver<Client, Config>)
☐ Driver loader function
☐ Service implementation (implements your interface)
☐ Factory (implements IServiceFactory<YourInterface>, reads process.env.X_DRIVER switch)
☐ Export from infrastructure/{name}/index.ts
☐ Add factory to infrastructure/infrastructure.loader.ts
☐ Error handling:
   - try wraps the driver call only; serialize/validate caller input before the try
   - never wrap caller callbacks — classify by the library's error class (isMongooseDriverError) and rethrow the rest
   - throw your InfrastructureError subclass ((message, data?, options?)) with the original in data.cause;
     drivers throw DriverError(message, cause)
   - never attach objects carrying secrets (e.g. AxiosError config/headers)
   - constructor guards the client with `if (!client)` only
```

---

## Naming Conventions

| Thing                        | Convention                   | Example                  |
| ---------------------------- | ---------------------------- | ------------------------ |
| Classes                      | PascalCase                   | `CustomerService`        |
| Files                        | kebab-case                   | `customer.service.ts`    |
| Interfaces                   | `I` + PascalCase             | `INewCustomer`, `ICache` |
| Type aliases                 | PascalCase                   | `CustomerStatus`         |
| DI tokens                    | camelCase                    | `customerService`        |
| Route exports                | PascalCase + `Routes` suffix | `CustomerRoutes`         |
| Domain interfaces (creation) | `INew{Model}`                | `INewCustomer`           |
| Domain interfaces (existing) | `I{Model}`                   | `ICustomer`              |
| Schema interfaces            | `INew{Model}Schema`          | `INewCustomerSchema`     |
| Type guard files             | kebab-case + `.guards.ts`    | `customer.guards.ts`     |

---

## Available Infrastructure Services (DI tokens)

| Token             | Interface         | Description                                                                                                                                                                                                                                                                                                              |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `database_mapper` | `IDatabaseMapper` | MongoDB via Mongoose; provides transactions — callback errors propagate unchanged, only driver failures become `PersistanceError`                                                                                                                                                                                        |
| `cache`           | `ICache`          | Redis                                                                                                                                                                                                                                                                                                                    |
| `logger`          | `ILogger`         | Winston                                                                                                                                                                                                                                                                                                                  |
| `queue`           | `IQueue`          | BullMQ                                                                                                                                                                                                                                                                                                                   |
| `email`           | `IEmail`          | SMTP                                                                                                                                                                                                                                                                                                                     |
| `storage`         | `IStorage`        | Local / cloud file storage — `readFile()` returns `null` and `listFiles()` returns `[]` for a missing path                                                                                                                                                                                                               |
| `notification`    | `INotification`   | Notification service                                                                                                                                                                                                                                                                                                     |
| `socket`          | `ISocket`         | Socket.IO                                                                                                                                                                                                                                                                                                                |
| `httpClient`      | `IHTTPClient`     | Axios HTTP client — `RequestConfig.data` accepts a single object or an array of objects (batch bodies): `Record<string, unknown> \| Record<string, unknown>[] \| undefined`. Non-2xx responses don't throw; a sent-but-failed request throws `NETWORK_ERROR`; a request that can't be set up rethrows the original error |

---

## JSDoc Documentation

Every **non-trivial** method and standalone/exported function — in **every** layer (controllers,
application services, domain services, repositories, mappers, infrastructure services, route
helpers), **including private helpers** — MUST carry a JSDoc block in the format below.
**Exempt:** trivial getters/setters and constructors.

```typescript
/**
 * <One-line imperative summary of what the method does.>
 *
 * @param {Type} name - <description>            // one per parameter, in declared order
 * @returns {Type} <description>                 // always; use {Promise<void>} for async no-return
 * @throws {DomainServiceError} <condition + error code>  // one per error type it can throw
 */
```

- Tag order is always `@param` (in declared order) → `@returns` → `@throws`; one blank line between
  summary and tags.
- `{Type}` braces are always present, even when redundant with TypeScript.
- One `@throws` per error type the method can surface; omit only when it cannot throw a domain error.

---

## Linting & Formatting

All rules are **errors** unless marked _(warn)_.

### Prettier

| Setting         | Value                                            |
| --------------- | ------------------------------------------------ |
| Line width      | 120 chars                                        |
| Indent          | 2 spaces                                         |
| Quotes          | Single (`'`)                                     |
| Semicolons      | Required                                         |
| Trailing commas | All positions (arrays, objects, function params) |
| Line endings    | LF (Unix)                                        |

### TypeScript ESLint

| Rule                            | Level | Requirement                                        |
| ------------------------------- | ----- | -------------------------------------------------- |
| `explicit-function-return-type` | error | Every function/method must declare its return type |
| `no-unused-vars`                | warn  | Prefix unused vars/params with `_` to suppress     |
| `no-explicit-any`               | warn  | Avoid — use precise types or `unknown`             |
| `consistent-type-imports`       | error | Use `import type` for all type-only imports        |

### Import Order (blank line between each group)

1. Node.js built-ins (`path`, `fs`, `crypto`…)
2. External npm packages (`express`, `mongoose`, `awilix`…)
3. Internal aliased paths (`@/…`)
4. Relative paths (`../`, `./`)

### General

- **No `console.log`** _(warn)_ — use the `logger` DI token (`ILogger`) instead
- Every file must end with exactly one newline (LF)

---

## Evaluation Criteria (Definition of Done)

Every code change must pass **all four** before it is considered complete:

1. **Logic correct** — behavior fulfills the request and follows every pattern in this guide.
2. **JSDoc present & correct** — every non-trivial method/function has a JSDoc block in the format
   under [JSDoc Documentation](#jsdoc-documentation).
3. **No lint errors** — `npm run lint` is clean (ESLint + Prettier). Auto-fix with
   `npm run lint:fix` / `npm run format`.
4. **No type errors** — `npx tsc --noEmit` passes and `npm run build` succeeds.

---

## Type Assertions Policy

**Never use a type assertion** (`as Type`, `<Type>value`, or the non-null assertion `!`)
**without the user's explicit consent first.** Default to type guards, discriminated unions,
generics, or an explicit type annotation on the source value instead of casting the result
afterward. `as const` (literal/tuple narrowing) is **not** a type assertion under this rule — it
never claims anything false about a value's runtime type, so it never needs consent.

**Pre-approved exceptions** — real, established structural patterns in this codebase that do
**not** require asking each time:

1. **Generic base-class boundaries** — e.g. `BaseMapper.toFilter`'s narrowing between
   `NewDomainModel` and `DBSchema`, or a generic sub-document helper narrowing `S` → `S & { _id:
string }`. The relationship between the generic type parameters is only guaranteed by the
   concrete subclass, not provable structurally by TS.
2. **`TransactionOptions.session` crossing into a concrete driver type** — it's deliberately typed
   `session?: unknown` to stay database-agnostic; a concrete Mongoose repository asserting it to
   `mongoose.mongo.ClientSession` (or similar) to actually use it is expected.
3. **Inside a hand-written `is` type-guard function's own implementation** — the guard's entire
   job is to prove an invariant TS can't infer; the assertion belongs there, never at a call site
   of the guard.
4. **`req.user!` in a controller method typed `AuthenticatedRequest`** — `UserValidatorMiddleware`
   guarantees `req.user` is populated by the time a controller runs (Rule 5 above), but
   `AuthenticatedRequest.user` stays optional in the type so it can also represent pre-auth
   request state.
5. **Narrowing a Mongoose `ref` field after `.populate()`** — the schema declares `Types.ObjectId`,
   but a populated field holds the referenced document at runtime; Mongoose's typings don't
   reflect population, so the mapper must assert to the known populated shape (see [Population
   Strategy](#population-strategy-mongoose-ref--populate)).

**Everything else** — any new assertion in domain services, controllers, application logic, or
anywhere not covered above — requires asking the user first, even when it "obviously" works.
