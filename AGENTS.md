# Infinite Node Application — AGENTS.md

> Concise rule-set for AI agents (Claude, Copilot, Cursor, etc.) working in this service.
> Full pattern documentation: `CLAUDE.md` in this folder and each service's `Docs/` directory.

---

## Identity

- **Platform:** Infinite Node Application
- **Owner:** Maleesha Gimshan ([@maleeshagimshan98](https://github.com/maleeshagimshan98))
- **Language:** TypeScript (strict), Node.js, Express.js

---

## Non-Negotiable Rules

1. **This guide is the source of truth.** Existing code may be outdated. When in doubt, follow the guide, not the existing code.
2. **Follow every pattern exactly.** Do not "improve", "simplify", or deviate without approval.
3. **Never create extra interfaces in infrastructure schema files.** Only `INew{Model}Schema` is allowed.
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
- **ApplicationServices** — only for multi-domain transactions; extend `BaseApplicationService`; `databaseMapperService` MUST be first constructor param; use `this.dbTransaction()`

### Domain (`src/domain/`)

- **Models** — four-part pattern: `INewModel`, `IModel`, `NewModel extends DomainEntity`, `Model extends NewModel`
- **Services** — extend `BaseDomainService`; inject `IXxxRepository` interfaces from `application/interfaces/repositories/`; wrap with `wrapInfrastructureErrors()`; throw only `DomainServiceError`

### Infrastructure (`src/infrastructure/`)

- **Schema** — `INew{Model}Schema` only (no extending interfaces); `timestamps: true`
- **Mapper** — implements `IBaseMapper<Schema, Model, NewModel>`; `toDomain(data: INewSchema & { _id: string | Types.ObjectId })` — always call `.toString()` on `_id`
- **Repository** — extends `BaseRepository<Schema, Model, NewModel>`; no duplicate CRUD methods
- **External services** — Driver → Service → Factory → registered in `infrastructure.loader.ts`

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

---

## Mapper Pattern

```typescript
// base/base.mapper.ts — toFilter lives here; concrete mappers inherit it
export abstract class BaseMapper<DBSchema, DomainModel, NewDomainModel>
  implements IBaseMapper<DBSchema, DomainModel, NewDomainModel> {
  abstract toDomain(data: DBSchema & { _id: string | Types.ObjectId }): DomainModel;
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
  toDomain(data: INewModelSchema & { _id: string | Types.ObjectId }): Model {
    return new Model({ id: data._id.toString(), ... });
  }
  toPersistence(data: NewModel): INewModelSchema {
    return !data.id ? { name: data.name } : { _id: data.id, name: data.name };
  }
}
```

- `toDomain` parameter type is always `INew{Model}Schema & { _id: string | Types.ObjectId }` — never create a separate interface for it
- `toPersistence` omits `_id` when `data.id` is falsy
- Concrete mappers **must extend `BaseMapper`**, not implement `IBaseMapper` directly — `toFilter` is inherited and must not be overridden

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
}
export default ModelService;
```

- Always `wrapInfrastructureErrors<T>(fn, onError?)` on every public async method
  - Full signature: `protected async wrapInfrastructureErrors<T>(fn: () => Promise<T>, onError?: (error: InfrastructureError) => Promise<void> | void): Promise<T>`
  - `onError` is optional — use it for per-call logging or alerting without altering error propagation
- Always accept `transactionOptions?: TransactionOptions` on write/transactional methods
- Always pass `transactionOptions` to repository calls

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

---

## Routes Pattern

```typescript
const router = Router();
const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

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

| Type                    | HTTP |
| ----------------------- | ---- |
| `NOT_FOUND`             | 404  |
| `ALREADY_EXISTS`        | 400  |
| `VALIDATION_ERROR`      | 400  |
| `INVALID_OPERATION`     | 400  |
| `INCOMPLETE_MODEL`      | 400  |
| `AUTHENTICATION_ERROR`  | 401  |
| `USER_PERMISSION_ERROR` | 403  |
| `UNKNOWN_ERROR`         | 500  |
| `DATABASE_ERROR`        | 500  |
| `INFRASTRUCTURE_ERROR`  | 500  |

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

| Token             | Interface         | Description                                 |
| ----------------- | ----------------- | ------------------------------------------- |
| `database_mapper` | `IDatabaseMapper` | MongoDB via Mongoose; provides transactions |
| `cache`           | `ICache`          | Redis                                       |
| `logger`          | `ILogger`         | Winston                                     |
| `queue`           | `IQueue`          | BullMQ                                      |
| `email`           | `IEmail`          | SMTP                                        |
| `storage`         | `IStorage`        | Local / cloud file storage                  |
| `notification`    | `INotification`   | Notification service                        |
| `socket`          | `ISocket`         | Socket.IO                                   |

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

## Microservice Overview

Each deployment defines its own service topology. Refer to the deployment repository for service names, ports, and database assignments.

---

## Evaluation Criteria (Definition of Done)

Every code change must pass **all four** before it is considered complete:

1. **Logic correct** — behavior fulfills the request and follows every pattern in this guide.
2. **JSDoc present & correct** — every non-trivial method/function has a JSDoc block in the format
   under [JSDoc Documentation](#jsdoc-documentation).
3. **No lint errors** — `npm run lint` is clean (ESLint + Prettier). Auto-fix with
   `npm run lint:fix` / `npm run format`.
4. **No type errors** — `npx tsc --noEmit` passes and `npm run build` succeeds.
