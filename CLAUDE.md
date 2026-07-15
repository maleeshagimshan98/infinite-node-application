# Infinite Node Application — CLAUDE.md

> This file gives Claude Code the context it needs to work correctly in this service.
> The **authoritative** pattern references are:
>
> - `Docs/architecture/infrastructure-layer-pattern.md`
> - `Docs/prompts/API_Resource_Guide.md`
> - `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md` — domain models, persistence models, data-mappers incl. sub-documents
> - `Docs/prompts/Database_Seeding_Guide.md` — database seeding

---

## 1. Repository at a Glance

**Infinite Node Application** is a clean-architecture Node.js/TypeScript service framework for
building scalable, DDD-layered REST APIs.

```
src/
├── app/                        # Express bootstrap, DI container, config, utils
├── presentation/http/          # Routes, Controllers, Validators, Middleware
├── application/                # Application services + cross-layer interfaces
├── domain/                     # Pure business logic — ZERO infrastructure imports
└── infrastructure/             # Persistence, cache, email, queue, storage, etc.
```

**Owner:** Maleesha Gimshan ([@maleeshagimshan98](https://github.com/maleeshagimshan98))

---

## 2. Tech Stack

| Concern        | Technology                                           |
| -------------- | ---------------------------------------------------- |
| Runtime        | Node.js                                              |
| Language       | TypeScript (strict)                                  |
| Framework      | Express.js                                           |
| DI container   | Awilix (CLASSIC injection, SINGLETON lifetime)       |
| Database       | MongoDB via Mongoose                                 |
| Cache / queues | Redis + BullMQ                                       |
| HTTP client    | Axios                                                |
| Validation     | express-validator                                    |
| Logging        | Winston                                              |
| Auth           | RS256 JWT (access + refresh)                         |
| Build          | tsc + tsc-alias                                      |
| Dev server     | tsx watch                                            |
| Frontend       | React 18 + Vite + Tailwind CSS                       |
| Deployment     | Docker Compose (local), AWS ECS Fargate (production) |
| IaC            | Terraform                                            |

### Path alias

This service uses `@/` → `src/`. **Always use `@/` for all intra-service imports.**

---

## 3. Clean Architecture Layers

Every service follows strict DDD layering (outside-in dependency rule: **no inner layer imports from an outer one**):

```
Presentation  →  Application  →  Domain  →  Infrastructure
```

```
src/
├── app/                        # Express bootstrap, DI container, config, utils
├── presentation/http/          # Routes, Controllers, Validators, Middleware
├── application/                # Application services (orchestration + transactions)
│   └── interfaces/             # All cross-layer interface contracts live here
├── domain/                     # Pure business logic — ZERO infrastructure imports
│   ├── base/                   # DomainEntity, BaseDomainService, DomainServiceError
│   └── erp/ (or feature/)
│       └── <module>-service/
│           ├── models/         # Domain model classes + interfaces
│           │   └── guards/     # TypeScript type guards (optional, only when needed)
│           └── service/        # Domain service
└── infrastructure/
    ├── core/                   # ICoreDriver, IDriverConfig, IServiceFactory
    ├── persistance/database/repositories/mongoose/
    │   ├── base/               # BaseRepository, IBaseMapper
    │   └── erp/<module>/       # *.model.ts, *.mapper.ts, *.repository.ts
    ├── cache/ email/ http/ logger/ notification/ queue/ socket/ storage/
    ├── infrastructure.loader.ts   # Array of factory constructors
    └── infrastructure.manager.ts  # Iterates loader, registers in Awilix
```

---

## 4. Dependency Injection (Awilix)

`InfrastructureManager.init()` → registers infrastructure services by `service.serviceName()`.  
`autoRegisterApplicationComponents()` → auto-discovers by glob and registers as camelCase:

| Glob pattern                                                              | Example class             | DI token                  |
| ------------------------------------------------------------------------- | ------------------------- | ------------------------- |
| `src/application/services/**/*.service.ts`                                | `OrderApplicationService` | `orderApplicationService` |
| `src/domain/**/service/*.service.ts`                                      | `CustomerService`         | `customerService`         |
| `src/infrastructure/persistance/database/repositories/**/*.repository.ts` | `CustomerRepository`      | `customerRepository`      |
| `src/presentation/http/controllers/**/*.controller.ts`                    | `CustomerController`      | `customerController`      |

**CRITICAL: Every auto-registered class MUST have `export default ClassName;` at the bottom of the file.**

Constructor parameters must match DI token names exactly (CLASSIC injection mode).

---

## 5. Domain Model Pattern (four-part)

File location: `src/domain/{feature}/models/{model-name}.ts`

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface INewModel {
  id?: string; // optional — creation context
  name: string;
  status: ModelStatus;
}

export interface IModel extends INewModel {
  id: string; // required — existing entity context
}

export class NewModel extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  protected _status: ModelStatus;

  constructor(data: INewModel) {
    super();
    if (data.id) this._id = data.id;
    this._name = data.name;
    this._status = data.status;
  }

  get id(): string | undefined {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get status(): ModelStatus {
    return this._status;
  }
  // setters only where mutation is needed
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

**Rules:**

- All fields are `protected _fieldName`; expose via getters (and setters only where needed)
- Invariant violations in constructors/setters → throw `DomainEntityError` (NOT `DomainServiceError`, NOT `Error`)
- `DomainEntity.toJSON()` auto-serializes all getters, stripping `_` prefix

### Type Guards (optional)

File location: `src/domain/{feature}/models/guards/{model-name}.guards.ts`

Create this file only when TypeScript narrowing is needed (e.g. `INewModel` → `IModel`, discriminated unions on type/status fields). Guards are **strictly `is` predicate functions** — no business logic, no infrastructure imports.

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INewModel, IModel } from '../{model-name}';

export function isModel(value: INewModel): value is IModel {
  return typeof value.id === 'string';
}
```

---

## 6. Infrastructure Schema Rule (ONE interface only)

File location: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.model.ts`

```typescript
// ✅ ONLY export INew{Model}Schema
export interface INewCustomerSchema {
  _id?: Types.ObjectId;
  no: string;
  name: string;
}
export const CustomerSchema = new Schema<INewCustomerSchema>({ ... }, { timestamps: true });
export const CustomerModel = model('customer', CustomerSchema);
```

**NEVER add `ICustomerSchema extends INewCustomerSchema` or `ICustomer` here.** The mapper handles `_id` via intersection type.

---

## 7. Mapper Pattern

File: `{feature}/{name}.mapper.ts`

```typescript
export class CustomerMapper extends BaseMapper<INewCustomerSchema, Customer, NewCustomer> {
  toDomain(data: INewCustomerSchema & { _id: Types.ObjectId }): Customer {
    return new Customer({ id: data._id.toString(), no: data.no, name: data.name });
  }

  toPersistence(data: NewCustomer): INewCustomerSchema {
    return !data.id
      ? { no: data.no, name: data.name }
      : { _id: new Types.ObjectId(data.id), no: data.no, name: data.name };
  }
}
```

- `toDomain` parameter `_id` is always `Types.ObjectId` — the `& { _id: Types.ObjectId }` intersection narrows the schema's optional `_id` to required for a hydrated read; never create a separate interface for it; always call `.toString()` — never assign directly
- `toPersistence` omits `_id` when `data.id` is falsy; when present, convert with `new Types.ObjectId(data.id)` — never assign the raw string (requires a value import: `import { Types } from 'mongoose';`)
- Concrete mappers **must extend `BaseMapper`**, not implement `IBaseMapper` directly — `toFilter` is inherited; do not override it
- **Sub-document mappers** use `BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel>` (no `_id` intersection on `toDomain`) — see §Sub-Documents in `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`

---

## 8. Repository Pattern

File: `{feature}/{name}.repository.ts`

```typescript
import type { ICustomerRepository } from '@/application/interfaces/repositories/erp/customer.repository.interface';

export class CustomerRepository
  extends BaseRepository<INewCustomerSchema, Customer, NewCustomer>
  implements ICustomerRepository
{
  constructor() {
    super(CustomerModel, new CustomerMapper());
  }
  // Only add domain-specific query methods beyond inherited CRUD
}
export default CustomerRepository;
```

`BaseRepository` provides: `create`, `findById`, `findOne`, `find`, `count`, `update`, `delete`.  
All accept an optional `TransactionOptions` as the last parameter.

---

## 9. Domain Service Pattern

File: `src/domain/{feature}/service/{name}.service.ts`

```typescript
import type { ICustomerRepository } from '@/application/interfaces/repositories/erp/customer.repository.interface';

export class CustomerService extends BaseDomainService {
  constructor(private readonly customerRepository: ICustomerRepository) {
    super();
  }

  async create(data: INewCustomer, opts?: TransactionOptions): Promise<Customer> {
    return this.wrapInfrastructureErrors<Customer>(async () => {
      const existing = await this.customerRepository.findOne({ no: data.no }, {}, opts);
      if (existing) throw new DomainServiceError(`Customer ${data.no} already exists`, 'ALREADY_EXISTS');
      return this.customerRepository.create(new NewCustomer(data), opts);
    });
  }

  async getById(id: string, opts?: TransactionOptions): Promise<Customer> {
    return this.wrapInfrastructureErrors<Customer>(async () => {
      const customer = await this.customerRepository.findById(id, opts);
      if (!customer) throw new DomainServiceError(`Customer ${id} not found`, 'NOT_FOUND');
      return customer;
    });
  }

  async delete(id: string, opts?: TransactionOptions): Promise<Customer> {
    return this.wrapInfrastructureErrors<Customer>(async () => {
      await this.getById(id, opts); // existence check — throws NOT_FOUND
      const deleted = await this.customerRepository.delete(id, opts);
      if (!deleted) throw new DomainServiceError(`Customer ${id} could not be deleted`, 'NOT_FOUND');
      return deleted;
    });
  }
}
export default CustomerService;
```

**`wrapInfrastructureErrors` signature (on `BaseDomainService`):**

```typescript
protected async wrapInfrastructureErrors<T>(
  fn: () => Promise<T>,
  onError?: (error: InfrastructureError) => Promise<void> | void,
): Promise<T>
```

- `fn` — the async operation to protect; its return type (`T`) is inferred automatically
- `onError` — optional callback invoked with the raw `InfrastructureError` before it is re-thrown as `DomainServiceError`; use for per-call logging or alerting without altering error propagation

**Rules:**

- Extend `BaseDomainService`
- All public async methods MUST be wrapped with `this.wrapInfrastructureErrors()`
- All write/read methods inside transactions MUST accept `transactionOptions?: TransactionOptions`
- Pass `transactionOptions` down to every repository call
- Only throw `DomainServiceError` — never raw `Error`
- Always check existence after `findById` / `findOne` and throw `'NOT_FOUND'`
- `delete()` always returns the deleted domain object — **never `void`**. Check existence before deleting (throw `'NOT_FOUND'`), then null-check the repository's delete result too (throw `'NOT_FOUND'` again) — `BaseRepository.delete()` returns `null` if nothing matched

---

## 10. Application Service Pattern (Transactions)

Use only when an operation spans multiple domain services in one transaction.

File: `src/application/services/{feature}/{name}.application.service.ts`

```typescript
export class OrderApplicationService extends BaseApplicationService {
  // IDatabaseMapper (as databaseMapperService) MUST be the first constructor parameter
  constructor(databaseMapperService: IDatabaseMapper, orderService: OrderService, ...) {
    super(databaseMapperService);
  }

  async createOrder(data: INewOrder): Promise<Order> {
    return this.dbTransaction(async ({ session }) => {
      const order = await this.orderService.createOrder(data, { session });
      await this.itemLedgerEntryService.createEntry(..., { session });
      return order;
    });
  }
}
export default OrderApplicationService;
```

**Rules:**

- `IDatabaseMapper` as `databaseMapperService` must be the **first** constructor parameter
- Use `this.dbTransaction()` for all transactional work
- Pass `{ session }` (as `TransactionOptions`) to every domain service call inside the callback

---

## 11. Controller Pattern

File: `src/presentation/http/controllers/{feature}/{name}.controller.ts`

```typescript
import type { ICustomerRepository } from '@/application/interfaces/repositories/erp/customer.repository.interface';

export class CustomerController extends BaseController {
  constructor(
    private customerService: CustomerService,
    private customerRepository: ICustomerRepository, // injected for count()
  ) {
    super();
  }

  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewCustomer>(req);
      const result = await this.customerService.create(data);
      return ApiResponseUtils.apiOkResponse(201, false, null, 'Customer created', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const totalCount = await this.customerRepository.count({});
      const paginator = this.getPaginator(req, totalCount);
      const items = await this.customerService.getAll(paginator.getLimit(), paginator.getOffset());
      return ApiResponseUtils.apiOkResponse(200, true, paginator, 'Customers retrieved', items);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}
export default CustomerController;
```

**Rules:**

- ALL logic must be inside `this.catchExceptionsWrapper()`
- Use `matchedData<T>(req)` for validated request data (never `req.body` directly)
- Inject the repository directly for `count()` (pagination total)
- Use `this.getPaginator(req, totalCount)` for pagination
- Always use `ApiResponseUtils` — never construct response objects manually

---

## 12. Validator Pattern

File: `src/presentation/http/validators/{feature}/{name}.validator.ts`

```typescript
import type { Schema } from 'express-validator';

export const newCustomerValidator = (): Schema => ({
  no: { notEmpty: true, isString: true, errorMessage: 'Customer number is required' },
  name: { notEmpty: true, isString: true, errorMessage: 'Customer name is required' },
  balance_lcy: { optional: true, isNumeric: true },
});
```

Validation belongs here only — **never inside controllers or domain services**.

---

## 13. Routes Pattern

File: `src/presentation/http/routes/{feature}.routes.ts`

```typescript
const router = Router();
const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

router.post(
  '/create',
  UserValidatorMiddleware(loginApplicationServiceProvider), // REQUIRED on every route
  RequestValidatorMiddleware(newCustomerValidator()), // on create/update routes
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<CustomerController>('customerController').create(req, res);
  },
);

export { router as CustomerRoutes }; // named export ending in "Routes"
```

**Rules:**

- `UserValidatorMiddleware` on **every** route — no exceptions
- `RequestValidatorMiddleware` on create/update routes
- Resolve controllers from container inside the handler
- Export as `export { router as FeatureRoutes }`

Register in `src/presentation/http/routes/index.ts`:

```typescript
router.use('/customers', CustomerRoutes);
```

---

## 14. Infrastructure Service Pattern

Adding a new infrastructure service (e.g. new database, third-party API):

1. **Interface** → `src/application/interfaces/{name}.interface.ts` (extends `IBaseInfrastructureService`, declares literal `serviceName()`)
2. **Config** → `src/infrastructure/{name}/driver/{driver}.config.ts` (extends `IDriverConfig`, reads env vars)
3. **Driver** → `src/infrastructure/{name}/driver/{driver}.driver.ts` (implements `ICoreDriver<Client, Config>`)
4. **Driver loader** → `src/infrastructure/{name}/driver/{driver}.driver.loader.ts`
5. **Service** → `src/infrastructure/{name}/{name}.service.ts` (implements both your interface and `IBaseInfrastructureService`)
6. **Factory** → `src/infrastructure/{name}/{name}-service.factory.ts` (implements `IServiceFactory<YourInterface>`, reads `process.env.X_DRIVER` switch)
7. **Export** → `src/infrastructure/{name}/index.ts`
8. **Register** → add factory class to `src/infrastructure/infrastructure.loader.ts`

**No other files need changing.** `InfrastructureManager` auto-picks it up.

---

## 15. Error Types → HTTP Status Mapping

| DomainServiceError type | HTTP                                      |
| ----------------------- | ----------------------------------------- |
| `AUTHENTICATION_ERROR`  | 401                                       |
| `USER_PERMISSION_ERROR` | 403                                       |
| `NOT_FOUND`             | 404                                       |
| `ALREADY_EXISTS`        | 400                                       |
| `VALIDATION_ERROR`      | 400                                       |
| `INVALID_OPERATION`     | 400                                       |
| `INCOMPLETE_MODEL`      | 400                                       |
| `UNKNOWN_ERROR`         | 500                                       |
| `DATABASE_ERROR`        | 500                                       |
| `NETWORK_ERROR`         | 500                                       |
| `INFRASTRUCTURE_ERROR`  | 500 (503 for NETWORK/CONNECTION sub-type) |

---

## 16. Coding Conventions Checklist

| Rule                  | Detail                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copyright header      | Every `.ts` file: `/** Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98) */`                                                                                                                                                                   |
| Path alias            | Use `@/` for all intra-service imports in this service                                                                                                                                                                                                              |
| Default export        | All services, repositories, controllers, and application services must `export default ClassName`                                                                                                                                                                   |
| No raw `Error`        | Domain layer: `DomainEntityError` (in models) or `DomainServiceError` (in services)                                                                                                                                                                                 |
| No CRUD duplication   | Never add `create`/`findById`/`update`/`delete` to a repository — they are already in `BaseRepository`                                                                                                                                                              |
| Mapper \_id           | Always use intersection type `INew{Model}Schema & { _id: Types.ObjectId }`; always call `.toString()` on `_id` — never create a separate interface or assign directly. In `toPersistence`, convert with `new Types.ObjectId(data.id)` — never assign the raw string |
| Schema interface      | Only `INew{Model}Schema` in the model file — no extending interfaces; `_id` is `_id?: Types.ObjectId`                                                                                                                                                               |
| Transaction flow      | `ApplicationService.dbTransaction()` → passes `TransactionOptions` → DomainService → Repository                                                                                                                                                                     |
| Validation layer      | Only in `src/presentation/http/validators/` using express-validator `Schema`                                                                                                                                                                                        |
| Response format       | Always `ApiResponseUtils` helpers — never manual response construction                                                                                                                                                                                              |
| Import type           | Prefer `import type` for type-only imports                                                                                                                                                                                                                          |
| Naming                | Classes PascalCase; files kebab-case; interfaces `I`-prefixed PascalCase; DI tokens camelCase                                                                                                                                                                       |
| Route exports         | Named export: `export { router as FeatureRoutes }`                                                                                                                                                                                                                  |
| Inline comments       | Write inline comments only when the WHY is non-obvious — never narrate obvious code                                                                                                                                                                                 |
| JSDoc                 | Every non-trivial method/function needs a full-tag JSDoc block (see §22). Exempt: trivial getters/setters and constructors                                                                                                                                          |
| Repository interfaces | Domain services and controllers must use `IXxxRepository` from `application/interfaces/repositories/` — never import concrete repository classes                                                                                                                    |

---

## 17. Infrastructure Port Reference

| Component | Default Port              |
| --------- | ------------------------- |
| MongoDB   | 27017 (replica set `rs0`) |
| Redis     | 6379                      |

---

## 18. External HTTP Communication

For calling external HTTP APIs, use the generic HTTP client at `src/infrastructure/http/`
(`HTTPClientService`, built with the standard Driver → Service → Factory infrastructure pattern
from `§14`). Resolve it from the container via the `httpClient` DI token (implements
`IHTTPClient` from `@/application/interfaces/http-client.interface`). Configure request timeout
via the `HTTP_CLIENT_TIMEOUT` env var (defaults to `5000`ms if unset).

All request methods take an `Omit<RequestConfig, 'method'>` config object. `RequestConfig.data`
is typed `Record<string, unknown> | Record<string, unknown>[] | undefined` — a request body may be
a single object **or an array of objects** (batch bodies). The explicit `| undefined` is required
because the project compiles with `exactOptionalPropertyTypes: true`; keep it when modifying the
type. `GET`/`DELETE` ignore `data`.

---

## 19. Complete Checklist for a New API Endpoint

```
☐ Step 1  Domain model (INewModel, IModel, NewModel, Model) — domain/{feature}/models/
☐ Step 2  Mongoose schema (INewModelSchema ONLY) — infrastructure/.../mongoose/{feature}/*.model.ts
☐ Step 3  Mapper (toDomain, toPersistence; intersection type for _id) — *.mapper.ts
☐ Step 4  Repository extends BaseRepository; export default — *.repository.ts
☐ Step 5  Domain service extends BaseDomainService; wrapInfrastructureErrors; TransactionOptions; export default
☐ Step 6  Application service extends BaseApplicationService (only if multi-domain transaction needed); export default
☐ Step 7  Validator (express-validator Schema functions) — validators/{feature}/
☐ Step 8  Controller extends BaseController; inject repo for count(); catchExceptionsWrapper; matchedData; export default
☐ Step 9  Routes — UserValidatorMiddleware on ALL routes; RequestValidatorMiddleware on write routes; export { router as XRoutes }
☐ Step 10 Register route in src/presentation/http/routes/index.ts
☐ Step 11 JSDoc on every non-trivial method (see §22)
☐ Step 12 Passes Evaluation Criteria (§23): logic correct, JSDoc, no lint errors, no type errors
```

---

## 20. Work In Progress / Planned Features

| Feature                            | Status                               |
| ---------------------------------- | ------------------------------------ |
| Queued workflow execution (BullMQ) | Modeled, not wired                   |
| Execution stack data passing       | Partially built                      |
| Auth middleware on routes          | Scaffolded (currently commented out) |
| Email/SMS/push notifications       | Settings modeled, no send logic      |
| Multi-currency ERP                 | Fields exist, no FX conversion       |
| Activity log emission from ERP     | Not started                          |
| Workflow success schema evaluation | Commented out                        |

---

## 21. Linting & Formatting

Rules enforced by `eslint.config.mjs` (ESLint + Prettier + eslint-plugin-import). All are **errors** unless marked _(warn)_.

### Prettier

| Option          | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| `printWidth`    | `120` — wrap lines at 120 characters                                  |
| `tabWidth`      | `2` — two-space indentation                                           |
| `singleQuote`   | `true` — use `'` not `"`                                              |
| `semi`          | `true` — semicolons required                                          |
| `trailingComma` | `'all'` — trailing commas in arrays, objects, and function parameters |
| `endOfLine`     | `'lf'` — Unix line endings only (no CRLF)                             |

### TypeScript ESLint

| Rule                            | Level | What it means                                                                          |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `explicit-function-return-type` | error | Every function and method must carry an explicit return type annotation                |
| `no-unused-vars`                | warn  | Unused variables/params generate a warning; prefix with `_` to suppress (e.g. `_opts`) |
| `no-explicit-any`               | warn  | Avoid `any`; use precise types or `unknown` when the shape is genuinely unknown        |
| `consistent-type-imports`       | error | Type-only imports must use `import type` — already required by Section 16              |

### Import Order

Groups must appear in this order, with a **blank line between each group**:

```typescript
// 1. Node.js built-ins
import path from 'path';

// 2. External npm packages
import { Router } from 'express';
import mongoose from 'mongoose';

// 3. Internal aliased paths (@/)
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { ICustomerRepository } from '@/application/interfaces/repositories/erp/customer.repository.interface';

// 4. Relative paths (parent / sibling)
import { BaseController } from '../base.controller';
import type { Request, Response } from 'express';
```

### General

- **`no-console` _(warn)_**: Never use `console.log / error / warn`. Use the `logger` DI token (`ILogger`) via constructor injection instead.
- Every `.ts` file must end with exactly one newline (LF). Configure your editor to enforce LF line endings, not CRLF.

---

## 22. JSDoc Documentation Requirement

Every **non-trivial** method and standalone/exported function — in **every** layer (controllers,
application services, domain services, repositories, mappers, infrastructure services, route
helpers), **including private helpers** — MUST carry a JSDoc block in the format below.

**Exempt** (no JSDoc needed): trivial getters/setters (domain-model accessors) and constructors.

```typescript
/**
 * <One-line imperative summary of what the method does.>
 *
 * @param {Type} name - <description>            // one per parameter, in declared order
 * @returns {Type} <description>                 // always; use {Promise<void>} for async no-return
 * @throws {DomainServiceError} <condition + error code>  // one per error type it can throw
 */
```

**Rules:**

- Tag order is always `@param` (in declared order) → `@returns` → `@throws`.
- One blank line between the summary and the tags.
- `{Type}` braces are always present, even when redundant with TypeScript. Use `{Promise<void>}`
  for an async method that returns nothing.
- One `@throws` per error type the method (or an uncaught call inside it) can surface. Omit `@throws`
  only when the method genuinely cannot throw a domain error.

**Real example** (from `login.application.service.ts`):

```typescript
/**
 * Rotate an access/refresh token pair: expire the current session and issue a new one.
 *
 * @param {string} accessToken - The current (raw) access token.
 * @param {string} refreshToken - The current (raw) refresh token.
 * @returns {Promise<{ accessToken: string; refreshToken: string }>} The newly issued token pair.
 * @throws {DomainServiceError} AUTHENTICATION_ERROR when the token is invalid or expired.
 */
async refresh(accessToken: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>
```

---

## 23. Evaluation Criteria (Definition of Done)

Every code change must pass **all four** before it is considered complete:

1. **Logic correct** — behavior fulfills the request and follows every pattern in this guide.
2. **JSDoc present & correct** — every non-trivial method/function has a JSDoc block in the §22
   format.
3. **No lint errors** — `npm run lint` is clean (ESLint + Prettier). Auto-fix with
   `npm run lint:fix` / `npm run format`.
4. **No type errors** — `npx tsc --noEmit` passes and `npm run build` succeeds.
