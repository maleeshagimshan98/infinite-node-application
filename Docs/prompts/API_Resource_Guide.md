# Comprehensive Guide: Creating New Endpoints in Infinite Node Application

---

## ⚠️ CRITICAL - READ THIS FIRST ⚠️

### 🚨 ENTERPRISE-LEVEL CODE STANDARDS 🚨

This is **ENTERPRISE-LEVEL CODE**. Every decision you make impacts production systems, team velocity, and long-term maintainability.

### 📋 MANDATORY RULES - STRICT COMPLIANCE REQUIRED:

#### 1. **FOLLOW THE GUIDE EXACTLY - ZERO DEVIATION**

- ✅ **Read each section completely** before writing any code
- ✅ **Use the EXACT patterns shown** - Character-by-character if needed
- ✅ **If guide shows 1 interface** → Create 1 interface (not 2, not 3)
- ✅ **If guide shows intersection types** → Use intersection types (don't create new interfaces)
- ✅ **If guide shows specific imports** → Use those imports (don't "optimize")
- ❌ **DO NOT** "improve" or "optimize" patterns without approval
- ❌ **DO NOT** assume existing code is correct - THIS GUIDE is the source of truth
- ❌ **DO NOT** skip steps thinking "I know what comes next"

#### 2. **NEVER MAKE ASSUMPTIONS - EVER**

**Common Dangerous Assumptions to AVOID:**

❌ "TypeScript is complaining, so I need to add this interface"  
→ ✅ **STOP. ASK.** The intersection type pattern handles it.

❌ "The existing service has this pattern, so I'll use it too"  
→ ✅ **STOP. CHECK GUIDE.** Existing code might be wrong.

❌ "This pattern seems cleaner/better/more efficient"  
→ ✅ **STOP. ASK.** Consistency > your preferences.

❌ "I'm sure this is what they meant"  
→ ✅ **STOP. ASK.** Mind-reading causes bugs.

❌ "It works, so it must be right"  
→ ✅ **STOP. VERIFY GUIDE.** Working ≠ Following standards.

#### 3. **WHEN TO STOP AND ASK QUESTIONS**

**IMMEDIATELY stop coding and ask when:**

🛑 **Pattern Confusion:**

- "Should I create IModel or IModelSchema in infrastructure?"
- "Which layer should this interface go in?"
- "Should I extend this interface?"

🛑 **TypeScript Errors:**

- "Getting type errors - should I add interfaces?"
- "Types don't match - should I cast?"
- "\_id type issues - need new interface?"

🛑 **Guide Conflicts:**

- "Guide shows X but existing code does Y"
- "Two sections seem contradictory"
- "Not sure which pattern applies here"

🛑 **Uncertainty:**

- "I think this is right but not 100% sure"
- "Multiple ways to do this - which one?"
- "Edge case not covered in guide"

**Format your question clearly:**

```
"I'm at Step X doing Y.
The guide shows pattern A.
But situation B is happening.
Should I: [option 1] or [option 2]?"
```

#### 4. **QUALITY OVER SPEED**

- ✅ Taking 5 minutes to re-read the guide is **GOOD**
- ✅ Asking 10 questions during implementation is **EXCELLENT**
- ✅ Stopping to validate against the guide is **PROFESSIONAL**
- ❌ "Moving fast" and creating technical debt is **UNACCEPTABLE**
- ❌ "I'll fix it later if it's wrong" is **NOT ACCEPTABLE**

#### 5. **VALIDATION CHECKLIST**

**After EVERY file you create, verify:**

```
☐ Does this match the guide's pattern EXACTLY?
☐ Did I create ONLY the interfaces the guide specifies?
☐ Are my imports from the correct layers?
☐ Did I follow the naming conventions precisely?
☐ Did I export as default where required?
☐ Would this pass a strict senior engineer review?
☐ Am I 100% confident this is correct per the guide?
```

**If ANY checkbox is uncertain → STOP and ASK**

### 🎯 CARDINAL RULES:

> **"The guide is the ONLY source of truth. Everything else is potentially wrong."**
>
> **"Asking a question takes 30 seconds. Fixing wrong patterns takes 30 minutes."**
>
> **"If you can't explain WHY your code matches the guide, don't write it."**
>
> **"Uncertainty is not weakness - it's wisdom. Assumptions are not confidence - they're risk."**

---

## Overview

This guide provides a complete, step-by-step approach for LLMs to create new features in the Infinite Node Application. The application follows a clean architecture pattern with clear separation of concerns across multiple layers.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Application Flow](#application-flow)
3. [Creating a New Endpoint](#creating-a-new-endpoint)
4. [Code Style Conventions](#code-style-conventions)
5. [Infrastructure Services](#infrastructure-services)
6. [Middleware](#middleware)

---

## Key Requirements Summary

Before implementing any endpoint, understand these critical requirements:

### Auto-Registration Requirements

- ✅ **All controllers, services, and repositories MUST export as default**
- ✅ **File naming must match patterns**: `*.service.ts`, `*.repository.ts`, `*.controller.ts`
- ✅ **Class naming**: `UserService` auto-registers as `'userService'` (camelCase)

### Interface Naming Conventions

- `INewModel` - User input/creation data (`id?: string` - optional)
- `IModel` - Database entities (`id: string` - required)
- `NewModel` - Class for creation
- `Model` - Class for existing entities (extends NewModel)

### Error Handling Requirements

- ✅ **Always check model existence** when retrieving from repository
- ✅ **Throw `DomainServiceError`** with appropriate type in domain services
- ✅ **Wrap all controller logic** in `catchExceptionsWrapper()`

### Authentication Requirements

- ✅ **Every route MUST use `UserValidatorMiddleware`**
- ✅ **Use `AuthenticatedRequest`** type for authenticated routes
- ✅ User data available as `req.user` after authentication

### Pagination Requirements

- ✅ **Use `this.getPaginator(req, totalCount)`** in controllers (it handles parameter validation)
- ✅ **Inject repository in controller** to access `count()` method directly
- ✅ **Add `getAll()` and `count()` methods** to domain services

---

## Architecture Overview

### Layers (Outside-In)

1. **Presentation Layer** (`src/presentation/http/`)
   - Routes
   - Controllers
   - Validators
   - Middleware

2. **Application Layer** (`src/application/`)
   - Interfaces (boundaries between layers)
   - Application Services (orchestration, transactions)

3. **Domain Layer** (`src/domain/`)
   - Domain Models (business entities)
   - Domain Services (business logic)
   - DTOs

4. **Infrastructure Layer** (`src/infrastructure/`)
   - Database (persistence, repositories, mappers)
   - External services (cache, email, queue, storage, logger, etc.)
   - Driver pattern for third-party clients

### Dependency Injection

The application uses **Awilix** for dependency injection:

- **Container Location**: `@/app/core/service.container`
- **Auto-registration**: Services, repositories, and controllers are auto-registered by naming convention
- **Resolution**: `container.resolve<Type>('serviceName')`

**Auto-registration pattern** (from `service.container.ts`):

```typescript
// Files matching these patterns are auto-registered:
// - src/application/services/**/*.service.{ts,js}
// - src/domain/**/service/*.service.{ts,js}
// - src/infrastructure/persistance/database/repositories/**/*.repository.{ts,js}
// - src/presentation/http/controllers/**/*.controller.{ts,js}

// Naming convention: UserService → 'userService'
// Lifetime: SINGLETON
```

**CRITICAL: Default Export Requirement**

For auto-registration to work, **all classes must be exported as default**:

```typescript
// ✅ CORRECT - Will be auto-registered
export class UserService extends BaseDomainService {
  // ...
}

export default UserService;

// ❌ INCORRECT - Will NOT be auto-registered
export class UserService extends BaseDomainService {
  // ...
}
// Missing default export
```

**What gets auto-registered**:

| File Pattern         | Example          | Registered As      |
| -------------------- | ---------------- | ------------------ |
| `**/*.service.ts`    | `UserService`    | `'userService'`    |
| `**/*.repository.ts` | `UserRepository` | `'userRepository'` |
| `**/*.controller.ts` | `UserController` | `'userController'` |

**Naming Format**: `camelCase` (UserService → userService)

**All registered as**: SINGLETON (single instance shared across application)

---

## Application Flow

### Request Flow (A to Z)

```
HTTP Request
    ↓
Route (routes/*.routes.ts)
    ↓
Middleware (validators, auth, etc.)
    ↓
Controller (controllers/**/*.controller.ts)
    ↓
Application Service (optional - transactions, orchestration)
    ↓
Domain Service (domain/**/service/*.service.ts)
    ↓
Repository (infrastructure/persistance/database/repositories/**)
    ↓
Database
```

### Example Flow (User Registration)

```
POST /api/auth/register
    ↓
auth.routes.ts → RequestValidatorMiddleware(userValidator())
    ↓
SignupController.register()
    ↓
SignupService.register()
    ↓
UserRepository.create()
    ↓
MongoDB (via Mongoose)
```

---

## Creating a New Endpoint

### Step 1: Define Domain Model

**Location**: `src/domain/{feature}/models/{model-name}.ts`

**Interface Naming Convention**:

- `INewModel`: Used for **user input/creation** - `id` is optional (`id?: string`)
- `IModel`: Used for **database entities** - `id` is required (`id: string`)

**Class Structure**:

- `NewModel`: For creating new entities (id optional)
- `Model`: For existing entities from database (id required, extends NewModel)

**When to use which**:

| Context                         | Use                  |
| ------------------------------- | -------------------- |
| Request body validation         | `INewModel`          |
| Domain service create method    | `INewModel`          |
| Domain service update parameter | `Partial<INewModel>` |
| Repository return value         | `Model`              |
| Domain service return value     | `Model`              |
| Database query result           | `Model`              |

**Pattern**:

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';
import { DomainEntityError } from '../../base/DomainEntityError';

type ModelStatus = 'active' | 'inactive' | 'pending';

export interface INewModel {
  id?: string;
  name: string;
  status: ModelStatus;
  // ... other fields
}

export interface IModel extends INewModel {
  id: string;
}

export class NewModel extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  protected _status: ModelStatus;

  constructor(data: INewModel) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._name = data.name;
    this._status = data.status;

    // Example constructor-level invariant validation
    // throw new DomainEntityError('...');
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get status(): ModelStatus {
    return this._status;
  }

  // Setters
  set id(value: string) {
    this._id = value;
  }

  set name(value: string) {
    this._name = value;
  }

  set status(value: ModelStatus) {
    // Example setter-level invariant validation:
    // if (someCondition) throw new DomainEntityError('...');
    this._status = value;
  }
}

export class Model extends NewModel {
  protected _id: string;

  constructor(data: IModel) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  // Business logic methods
  isActive(): boolean {
    return this._status === 'active';
  }
}

// Default export required for potential future use
export default Model;
```

**Conventions**:

- `INewModel`: Interface for creation/user input (id is optional: `id?: string`)
- `IModel`: Interface for existing entities from database (id is required: `id: string`)
- `NewModel`: Class for creation (id is optional) — **must extend `DomainEntity`**
- `Model`: Class for existing entities (id is required, extends NewModel)
- Use protected fields with getters/setters
- Add business logic methods to domain models
- **Throw `DomainEntityError`** (from `@/domain/base/DomainEntityError`) for invariant violations in constructors and setters — **never use plain `Error` inside domain models**
- `DomainEntityError` is distinct from `DomainServiceError`: entity-level invariants (e.g. field value constraints) belong in the model; business rule violations (e.g. not-found, already-exists) belong in the service
- **Must export as default** for Awilix auto-registration

---

#### Type Guards (optional)

**Location**: `src/domain/{feature}/models/guards/{model-name}.guards.ts`

Create this file only when TypeScript narrowing is genuinely needed — for example, narrowing `INewModel` to `IModel`, or narrowing a discriminated union on a `type` or `status` field.

**Rules:**

- Strictly `is` predicate functions — zero business logic
- No imports from infrastructure, application, or other domain services
- One file per model, co-located with that model's folder

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { INewModel, IModel } from '../{model-name}';

export function isModel(value: INewModel): value is IModel {
  return typeof value.id === 'string';
}
```

**⚠️ Do NOT create guards files for every model by default.** Only add them when a caller would otherwise need `as` casts or manual `typeof` checks.

---

### Step 2: Create Mongoose Schema and Model

**Location**: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.model.ts`

**Pattern**:

```typescript
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

type ModelStatus = 'active' | 'inactive' | 'pending';

export interface INewModelSchema {
  _id?: Types.ObjectId;
  name: string;
  status: ModelStatus;
  // ... other fields
}

export const ModelSchema = new Schema<INewModelSchema>(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      required: true,
      default: 'pending',
    },
    // ... other fields
  },
  { timestamps: true }, // Adds createdAt and updatedAt
);

export const ModelModel = model('model', ModelSchema);
```

**Conventions**:

- Use `INew{Model}Schema` interface for TypeScript typing
- Use `timestamps: true` for automatic date tracking
- Define enums explicitly in schema for validation
- Model export is not strictly required for auto-registration, but schema and mappers are used by repositories

**⚠️ CRITICAL - Infrastructure Schema Rules:**

**✅ CORRECT - Only one interface:**

```typescript
export interface INewModelSchema {
  _id?: Types.ObjectId; // optional — omitted on fresh creates
  name: string;
  status: ModelStatus;
  // ... fields
}
// That's it - no other interfaces!
```

**❌ WRONG - Do NOT add extending interfaces:**

```typescript
// ❌ WRONG - These extending interfaces should NOT exist in infrastructure.
// The problem is the extra interface, not the Types.ObjectId type — the schema
// interface itself already declares `_id?: Types.ObjectId`.
export interface IModel extends INewModelSchema {
  _id: Types.ObjectId;
}

export interface IModelSchema extends INewModelSchema {
  _id: Types.ObjectId;
}
```

**WHY THIS MATTERS:**

- Extending interface pattern (`IModel extends INewModel`) is **ONLY for domain models**
- Infrastructure schemas should **ONLY export `INew{Model}Schema`** (with an optional `_id?: Types.ObjectId`)
- Mappers narrow `_id` to required via the intersection type — no separate interface needed
- Adding extra interfaces creates confusion and violates clean architecture separation

**If you see TypeScript errors about `_id` types:**

- ✅ Fix it in the mapper by using `INew{Model}Schema & { _id: Types.ObjectId }`
- ❌ Don't add interfaces to the schema file

---

### Step 3: Create Mapper

**Location**: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.mapper.ts`

**Pattern**:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewModel } from '@/domain/{feature}/models/{model-name}';
import { Model } from '@/domain/{feature}/models/{model-name}';

import { BaseMapper } from '../base/base.mapper';
import type { INewModelSchema } from './{model-name}.model';

export class ModelMapper extends BaseMapper<INewModelSchema, Model, NewModel> {
  toDomain(data: INewModelSchema & { _id: Types.ObjectId }): Model {
    return new Model({
      id: data._id.toString(),
      name: data.name,
      status: data.status,
      // ... other fields
    });
  }

  toPersistence(data: NewModel): INewModelSchema {
    return !data.id
      ? {
          name: data.name,
          status: data.status,
          // ... other fields
        }
      : {
          _id: new Types.ObjectId(data.id),
          name: data.name,
          status: data.status,
          // ... other fields
        };
  }
}
```

**Conventions**:

- `toDomain()`: Converts database schema (`INewModelSchema & { _id: Types.ObjectId }`) to domain model (`Model` with required id); always call `.toString()` on `_id` — never assign directly
- `toPersistence()`: Converts domain model (`NewModel`) to database schema (`INewModelSchema`)
- Handle `id` vs `_id` mapping (domain uses `id`, MongoDB uses `_id`)
- Check if `data.id` exists to determine if `_id` should be included in persistence object; when included, convert with `new Types.ObjectId(data.id)` — never assign the raw string (requires a value import of `Types`)
- Concrete mappers **must extend `BaseMapper`**, not implement `IBaseMapper` directly — `toFilter` is inherited and must not be overridden
- `toFilter` (inherited) maps the domain `id` field to `_id` and also **strips any key whose value is `undefined`**, so partial domain filter objects can be passed directly without risking Mongoose querying on `undefined` fields

**⚠️ IMPORTANT - Parameter Type Pattern:**

The `toDomain()` parameter type `INewModelSchema & { _id: Types.ObjectId }` is the **correct and complete** pattern. You do NOT need to create additional interfaces like `IModel` or `IModelSchema` in the infrastructure schema file. The intersection type handles everything needed.

```typescript
// ✅ CORRECT - extend BaseMapper, use intersection type, call .toString()
toDomain(data: INewModelSchema & { _id: Types.ObjectId }): Model {
  return new Model({ id: data._id.toString(), ... });
}

// ❌ WRONG - Don't create IModelSchema interface for this
export interface IModelSchema extends INewModelSchema {
  _id: Types.ObjectId;
}
toDomain(data: IModelSchema): Model { // NO! Don't do this
  // ...
}
```

---

### Step 4: Create Repository

**Location**: `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.repository.ts`

**Pattern**:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Model, NewModel } from '@/domain/{feature}/models/{model-name}';

import { BaseRepository } from '../base/base-repository';
import { ModelMapper } from './{model-name}.mapper';
import { ModelModel } from './{model-name}.model';

import type { INewModelSchema } from './{model-name}.model';

export class ModelRepository extends BaseRepository<INewModelSchema, Model, NewModel> {
  constructor() {
    super(ModelModel, new ModelMapper());
  }

  // Add custom repository methods if needed
  // Example:
  // async findByName(name: string): Promise<Model | null> {
  //   return await this.findOne({ name });
  // }
}

export default ModelRepository;
```

**Base Repository Methods** (inherited):

- `create(item: NewModel, transactionOptions?: TransactionOptions): Promise<Model>`
- `bulkCreate(items: NewModel[], transactionOptions?: TransactionOptions): Promise<Model[]>`
- `findById(id: string, transactionOptions?: TransactionOptions): Promise<Model | null>`
- `findOne(filter: Partial<NewModel>, sort?: Record<string, 1 | -1>, transactionOptions?: TransactionOptions): Promise<Model | null>`
- `find(filter: Partial<NewModel>, limit?: number, offset?: number, sort?: Record<string, 1 | -1>, transactionOptions?: TransactionOptions): Promise<Model[]>`
- `count(filter: Partial<NewModel>, transactionOptions?: TransactionOptions): Promise<number>`
- `update(id: string, item: NewModel, transactionOptions?: TransactionOptions): Promise<Model | null>`
- `delete(id: string, transactionOptions?: TransactionOptions): Promise<Model | null>`

`TransactionOptions` is `{ session?: unknown }`, imported from `@/application/interfaces/database-mapper.interface`.

**Conventions**:

- **Must export as default** for Awilix auto-registration
- Naming: `ModelRepository` → registered as `'modelRepository'`
- Extend BaseRepository for common CRUD operations
- Add custom methods for specific queries
- Repository file must match pattern: `**/*.repository.{ts,js}`

---

### Step 5: Create Domain Service

**Location**: `src/domain/{feature}/service/{feature}.service.ts`

**Pattern**:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { IModelRepository } from '@/application/interfaces/repositories/{feature}/model.repository.interface';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

import { NewModel, type Model } from '../models/{model-name}';
import type { INewModel } from '../models/{model-name}';

export class ModelService extends BaseDomainService {
  private readonly modelRepository: IModelRepository;

  constructor(modelRepository: IModelRepository) {
    super();
    this.modelRepository = modelRepository;
  }

  /**
   * Create a new model.
   *
   * @param {INewModel} data - Model creation data
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Model>} The newly created model
   * @throws {DomainServiceError} ALREADY_EXISTS when a model with the same name exists
   */
  async create(data: INewModel, transactionOptions?: TransactionOptions): Promise<Model> {
    return this.wrapInfrastructureErrors<Model>(async () => {
      const existing = await this.modelRepository.findOne({ name: data.name }, undefined, transactionOptions);
      if (existing) {
        throw new DomainServiceError('Model with this name already exists', 'ALREADY_EXISTS');
      }

      const newModel = new NewModel(data);
      return await this.modelRepository.create(newModel, transactionOptions);
    });
  }

  /**
   * Retrieve a model by its ID.
   *
   * @param {string} id - Model ID
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Model>} The found model
   * @throws {DomainServiceError} NOT_FOUND when the model does not exist
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<Model> {
    return this.wrapInfrastructureErrors<Model>(async () => {
      const model = await this.modelRepository.findById(id, transactionOptions);
      if (!model) {
        throw new DomainServiceError('Model not found', 'NOT_FOUND');
      }
      return model;
    });
  }

  /**
   * Retrieve all models with optional pagination.
   *
   * @param {number} limit - Maximum number of items to return
   * @param {number} offset - Number of items to skip
   * @returns {Promise<Model[]>} Array of models
   */
  async getAll(limit?: number, offset?: number): Promise<Model[]> {
    return this.wrapInfrastructureErrors<Model[]>(async () => {
      return await this.modelRepository.find({}, limit, offset);
    });
  }

  /**
   * Count total models matching an optional filter.
   *
   * @param {Partial<INewModel>} filter - Optional filter criteria
   * @returns {Promise<number>} Total count
   */
  async count(filter: Partial<INewModel> = {}): Promise<number> {
    return this.wrapInfrastructureErrors<number>(async () => {
      return await this.modelRepository.count(filter);
    });
  }

  /**
   * Update a model by ID.
   *
   * @param {string} id - Model ID
   * @param {Partial<INewModel>} data - Fields to update
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Model>} The updated model
   * @throws {DomainServiceError} NOT_FOUND when the model does not exist
   */
  async update(id: string, data: Partial<INewModel>, transactionOptions?: TransactionOptions): Promise<Model> {
    return this.wrapInfrastructureErrors<Model>(async () => {
      const existing = await this.getById(id, transactionOptions);

      const updated = new NewModel({
        id: existing.id,
        name: data.name ?? existing.name,
        status: data.status ?? existing.status,
      });

      const result = await this.modelRepository.update(id, updated, transactionOptions);
      if (!result) {
        throw new DomainServiceError('Model not found', 'NOT_FOUND');
      }
      return result;
    });
  }

  /**
   * Delete a model by ID.
   *
   * @param {string} id - Model ID
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Model>} The deleted model
   * @throws {DomainServiceError} NOT_FOUND when the model does not exist, or when the delete itself fails
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<Model> {
    return this.wrapInfrastructureErrors<Model>(async () => {
      await this.getById(id, transactionOptions);

      const deleted = await this.modelRepository.delete(id, transactionOptions);
      if (!deleted) {
        throw new DomainServiceError('Model could not be deleted', 'NOT_FOUND');
      }
      return deleted;
    });
  }
}

export default ModelService;
```

**DomainServiceError Types**:

- `'AUTHENTICATION_ERROR'` → 401 response
- `'USER_PERMISSION_ERROR'` → 403 response
- `'NOT_FOUND'` → 404 response
- `'ALREADY_EXISTS'` → 400 response
- `'VALIDATION_ERROR'` → 400 response (can include data)
- `'INCOMPLETE_MODEL'` → 400 response
- `'UNKNOWN_ERROR'` → 500 response
- `'INFRASTRUCTURE_ERROR'` → 500 response (503 if sub-type is `NETWORK_ERROR` or `CONNECTION_ERROR`)

**Conventions**:

- **Must export as default** for Awilix auto-registration
- Extend `BaseDomainService`
- Inject repositories via constructor
- **Always check model existence** when retrieving from repository
- Throw `DomainServiceError` for business rule violations with appropriate error types
- Service file must match pattern: `**/service/*.service.{ts,js}`
- DomainServiceError is caught by `catchExceptionsWrapper()` in BaseController
- **Transaction Support**: All domain service methods that perform write operations (create, update, delete) or read operations within a transaction **MUST** accept an optional `transactionOptions?: TransactionOptions` parameter
  - Import `TransactionOptions` from `@/application/interfaces/database-mapper.interface`
  - This allows application services to pass database sessions for transaction support
  - Always pass the `transactionOptions` parameter to repository methods when it's provided
  - `TransactionOptions` is `{ session?: unknown }` where `session` depends on the underlying database mapper (Mongoose ClientSession, Sequelize Transaction, etc.)
- **Infrastructure Error Wrapping**: All public async methods **MUST** be wrapped with `return this.wrapInfrastructureErrors<T>(async (): Promise<T> => { ... })` — this converts `InfrastructureError` to `DomainServiceError` with type `'INFRASTRUCTURE_ERROR'`, ensuring uniform error handling in the controller via `catchExceptionsWrapper()`

  **Full signature:**

  ```typescript
  protected async wrapInfrastructureErrors<T>(
    fn: () => Promise<T>,
    onError?: (error: InfrastructureError) => Promise<void> | void,
  ): Promise<T>
  ```

  - `fn` — the async operation to protect; its return type (`T`) is inferred automatically
  - `onError` — optional callback invoked with the raw `InfrastructureError` **before** it is re-thrown as `DomainServiceError`; use for per-method logging or alerting without altering error propagation

---

### Step 6: Create Application Service (Optional)

**Location**: `src/application/services/{feature}/{feature}.application.service.ts`

**Use When**:

- Need database transactions across multiple operations
- Need to orchestrate multiple domain services
- Need application-level concerns (caching, logging, etc.)

**Pattern**:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDatabaseMapper } from '@/application/interfaces';
import { BaseApplicationService } from '../base/base.application.service';
import type { ModelService } from '@/domain/{feature}/{feature}.service';
import type { OtherService } from '@/domain/{other-feature}/{other-feature}.service';
import type { INewModel } from '@/domain/{feature}/models/{model-name}';

export class ModelApplicationService extends BaseApplicationService {
  private modelService: ModelService;
  private otherService: OtherService;

  constructor(databaseMapperService: IDatabaseMapper, modelService: ModelService, otherService: OtherService) {
    super(databaseMapperService);
    this.modelService = modelService;
    this.otherService = otherService;
  }

  /**
   * Create model with transaction
   *
   * @param {INewModel} data - Model data
   * @returns {Promise<{ id: string }>}
   */
  async createWithTransaction(data: INewModel): Promise<{ id: string }> {
    return await this.dbTransaction(async ({ session }) => {
      // All operations within this callback execute in the same database transaction
      // Pass { session } (as TransactionOptions) to all domain service methods that participate in the transaction

      // Create the main model
      const model = await this.modelService.create(data, { session });

      // Perform related operations within the same transaction
      await this.otherService.createRelated({ modelId: model.id }, { session });

      // Update another entity within the transaction
      await this.otherService.update(data.relatedId, { status: 'processed' }, { session });

      // Transaction is automatically committed if callback succeeds
      // Transaction is automatically rolled back if any error is thrown

      return { id: model.id };
    });
  }
}

export default ModelApplicationService;
```

**How Transactions Work**:

1. **BaseApplicationService** provides `dbTransaction()` method that wraps `IDatabaseMapper.transaction()`
2. **IDatabaseMapper** is provided by the database mapper factory (Mongoose, TypeORM, etc.)
3. The `transaction()` method executes the callback with a `TransactionOptions` parameter (`{ session }`)
4. **Pass `{ session }` (as `TransactionOptions`)** to all domain service methods that should participate in the transaction
5. Domain services pass the `transactionOptions` parameter to repository methods
6. **Automatic commit/rollback**: Transaction commits if callback succeeds, rolls back if any error is thrown

**Constructor Pattern**:

- **CRITICAL**: `IDatabaseMapper` (as `databaseMapperService`) **MUST be the first parameter**
- Then inject domain services in order of dependency or usage
- This pattern ensures the database mapper is available before any domain services

**Conventions**:

- **Must export as default** for Awilix auto-registration
- Extend `BaseApplicationService`
- Inject `IDatabaseMapper` (as `databaseMapperService`) **FIRST** in constructor
- Use `this.dbTransaction()` for transactional operations
- **ALWAYS pass `{ session }` (as `TransactionOptions`)** to domain service methods within transaction callback
- Domain services will pass `transactionOptions` to repository methods
- Service file must match pattern: `**/*.service.{ts,js}`
- Transaction automatically commits on success, rolls back on error

---

### Step 7: Create Validator

**Location**: `src/presentation/http/validators/{feature}/{model-name}.validator.ts`

**Pattern**:

```typescript
import type { Schema } from 'express-validator';

export const newModelValidator = (): Schema => {
  return {
    name: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Name is required',
    },
    status: {
      optional: true,
      isIn: {
        options: [['active', 'inactive', 'pending']],
      },
      errorMessage: 'Invalid status',
    },
    email: {
      optional: true,
      isEmail: true,
      errorMessage: 'Invalid email format',
    },
    age: {
      optional: true,
      isInt: {
        options: { min: 0, max: 120 },
      },
      errorMessage: 'Age must be between 0 and 120',
    },
  };
};

export const updateModelValidator = (): Schema => {
  return {
    name: {
      optional: true,
      isString: true,
    },
    status: {
      optional: true,
      isIn: {
        options: [['active', 'inactive', 'pending']],
      },
    },
  };
};
```

**Common Validators**:

- `notEmpty: true` - Field must not be empty
- `isEmail: true` - Valid email format
- `isString: true` - Must be string
- `isInt: true` - Must be integer
- `isBoolean: true` - Must be boolean
- `isIn: { options: [[...]] }` - Must be one of specified values
- `optional: true` - Field is optional

**Conventions**:

- Export function returning `Schema` object
- Use `errorMessage` for custom error messages
- Create separate validators for create/update operations

---

### Step 8: Create Controller

**Location**: `src/presentation/http/controllers/{feature}/{model-name}.controller.ts`

**Pattern**:

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { ModelService } from '@/domain/{feature}/service/{feature}.service';
import type { ModelRepository } from '@/infrastructure/persistance/database/repositories/mongoose/{feature}/{model-name}.repository';
import type { INewModel } from '@/domain/{feature}/models/{model-name}';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class ModelController extends BaseController {
  private modelService: ModelService;
  private modelRepository: ModelRepository;

  constructor(modelService: ModelService, modelRepository: ModelRepository) {
    super();
    this.modelService = modelService;
    this.modelRepository = modelRepository;
  }

  /**
   * Create a new model
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewModel>(req);
      const result = await this.modelService.create(data);

      return ApiResponseUtils.apiOkResponse(201, false, null, 'Model created successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get all models (paginated)
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      // Get total count from repository
      const totalCount = await this.modelRepository.count({});

      // getPaginator validates parameters and throws PaginationException if invalid
      const paginator = this.getPaginator(req, totalCount);

      // Fetch paginated results
      const items = await this.modelService.getAll(paginator.getLimit(), paginator.getOffset());

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Models retrieved successfully', {
        items,
        pagination: {
          page: paginator.getCurrentPage(),
          limit: paginator.getLimit(),
          total: totalCount,
          totalPages: paginator.getTotalPages(),
        },
      });
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get model by ID
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;

      // Service will throw DomainServiceError if not found
      // catchExceptionsWrapper will catch it and convert to appropriate response
      const result = await this.modelService.getById(id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Model retrieved successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update model
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;
      const data = matchedData<Partial<INewModel>>(req);
      const result = await this.modelService.update(id, data);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Model updated successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete model
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async delete(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;
      await this.modelService.delete(id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Model deleted successfully', null);
    });

    return ApiResponseUtils.createResponse(response, res);
  }
}

export default ModelController;

// Note: Default export is REQUIRED for Awilix auto-registration
```

**ApiResponseUtils Methods**:

- `apiOkResponse(code, error, errors, message, data)` - Success response
- `apiErrorResponse(code, message, data?, headers?)` - Error response; `headers` is an optional
  `Record<string, string>` of response headers (e.g. `Retry-After`), applied to the client by
  `createResponse()` via `APIResponse.applyHeaders(res)` - no extra call needed in the controller
- `createResponse(response, res)` - Send response to client (sets status, headers, and body)
- `resourceNotFoundErrorResponse(message)` - 404 response
- `requestValidationFailResponse(errors)` - Validation error response
- `getServerErrorAPIResponse()` - 500 response
- `userNotPermittedError(message)` - 403 response
- `authenticationErrorResponse(message)` - 401 response

**Conventions**:

- **Must export as default** for Awilix auto-registration
- Extend `BaseController`
- Inject services and repositories via constructor
- Use `matchedData()` to get validated data from request
- **Wrap all logic in `catchExceptionsWrapper()`** - it catches DomainServiceError and PaginationException
- Use `this.getPaginator(req, totalCount)` for pagination - it validates parameters automatically
- Use repository's `count()` method directly in controller for total count
- Use `ApiResponseUtils` for consistent responses
- Controller file must match pattern: `**/*.controller.{ts,js}`
- `catchExceptionsWrapper` automatically converts DomainServiceError types to appropriate HTTP responses

---

### Step 9: Create Routes

**Location**: `src/presentation/http/routes/{feature}.routes.ts`

**Pattern**:

```typescript
import { Router } from 'express';

import {
  newModelValidator,
  updateModelValidator,
} from '@/presentation/http/validators/{feature}/{model-name}.validator';
import { container } from '@/app/core/service.container';
import type { LoginApplicationService } from '@/domain/auth/service/login.application.service';

import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';

import type { ModelController } from '../controllers/{feature}/{model-name}.controller';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

const router = Router();

// All routes require authentication
const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

// Get all models (paginated)
router.get(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<ModelController>('modelController');
    controller.getAll(req, res);
  },
);

// Get model by ID
router.get(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<ModelController>('modelController');
    controller.getById(req, res);
  },
);

// Create new model
router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(newModelValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<ModelController>('modelController');
    controller.create(req, res);
  },
);

// Update model
router.put(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(updateModelValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<ModelController>('modelController');
    controller.update(req, res);
  },
);

// Delete model
router.delete(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<ModelController>('modelController');
    controller.delete(req, res);
  },
);

export { router as ModelRoutes };
```

**Middleware Order**:

1. **Authentication middleware (REQUIRED on all routes)** - `UserValidatorMiddleware`
2. Validation middleware - `RequestValidatorMiddleware`
3. Route handler

**Conventions**:

- **Use `UserValidatorMiddleware` on ALL routes** - authentication is required
- Resolve controllers from container in route handler
- Use `RequestValidatorMiddleware` for request body/query validation
- Pass validator schemas from validators folder
- Create `loginServiceProvider` helper to avoid repetition
- Use `AuthenticatedRequest` type for requests after authentication
- Export as named export: `export { router as FeatureRoutes }`

---

### Step 10: Register Routes

**Location**: `src/presentation/http/routes/index.ts`

**Pattern**:

```typescript
import { Router } from 'express';

import { AuthRoutes } from './auth.routes';
import { HealthRoutes } from './health.routes';
import { ModelRoutes } from './{feature}.routes'; // ADD THIS

const router = Router();

router.use('/health', HealthRoutes);
router.use('/auth', AuthRoutes);
router.use('/models', ModelRoutes); // ADD THIS

export default router;
```

**Conventions**:

- Import route modules
- Mount on appropriate path
- Base URL is already prefixed (configured in app.config.ts)

---

### Step 11: Seed Default Data (Optional)

If this resource needs default/bootstrap data (e.g. built-in roles, default settings), add a
seeder rather than duplicating that logic elsewhere. This is out of scope for this guide — see
`Docs/prompts/Database_Seeding_Guide.md` for the full pattern (`seed{Feature}()`/`clear{Feature}()`
exports, and how to register the seeder by hand, in dependency order, in
`src/infrastructure/persistance/database/seeders/seeder.ts`).

---

## Code Style Conventions

### General Rules

1. **Copyright Header**: Include on every file

   ```typescript
   /**
    * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
    */
   ```

2. **Import Order**:
   - Third-party imports
   - Application imports (use `@/` alias)
   - Type imports (use `import type`)
   - Blank line between groups

   ```typescript
   import { matchedData } from 'express-validator';

   import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
   import type { ModelService } from '@/domain/{feature}/service/{feature}.service';

   import { BaseController } from '../base.controller';

   import type { Request, Response } from 'express';
   ```

3. **Naming Conventions**:
   - Classes: PascalCase (`UserService`, `LoginController`)
   - Files: kebab-case matching class name (`user.service.ts`, `login.controller.ts`)
   - Interfaces: PascalCase with `I` prefix (`INewUser`, `ICache`)
   - Type aliases: PascalCase (`UserStatus`)
   - Variables/functions: camelCase (`userService`, `getById`)

4. **Type Safety**:
   - Always use TypeScript types
   - Use `type` for type aliases
   - Use `interface` for object shapes
   - Prefer `import type` for type-only imports

5. **Access Modifiers**:
   - Use `private` for internal implementation
   - Use `protected` for inheritance
   - Use `public` (or omit) for API surface
   - Use `readonly` for immutable properties

6. **JSDoc Comments**:
   - Document all public methods
   - Include `@param`, `@returns`, `@throws`
   - Provide usage examples for complex APIs

   ```typescript
   /**
    * Create a new user
    *
    * @param {INewUser} userData - User registration data
    * @returns {Promise<User>}
    * @throws {DomainServiceError}
    */
   async create(userData: INewUser): Promise<User> {
     // Implementation
   }
   ```

---

## Infrastructure Services

### Using Existing Infrastructure Services

Infrastructure services are accessible via dependency injection:

```typescript
import type { ICache } from '@/application/interfaces/cache.interface';
import type { ILogger } from '@/application/interfaces/logger.interface';
import type { IQueue } from '@/application/interfaces/queue.interface';
import type { IEmail } from '@/application/interfaces/email.interface';
import type { IStorage } from '@/application/interfaces/storage.interface';

export class MyService extends BaseDomainService {
  private cache: ICache;
  private logger: ILogger;

  constructor(cache: ICache, logger: ILogger) {
    super();
    this.cache = cache;
    this.logger = logger;
  }

  async myMethod(): Promise<void> {
    // Use cache
    const cached = await this.cache.get<string>('key');
    if (!cached) {
      await this.cache.set('key', 'value', 3600); // TTL in seconds
    }

    // Use logger
    this.logger.logInfo('Operation completed');
  }
}
```

**Available Infrastructure Services**:

- `cache` (ICache) - Redis caching
- `logger` (ILogger) - Winston logging
- `queue` (IQueue) - BullMQ queue
- `email` (IEmail) - SMTP email
- `storage` (IStorage) - Local/cloud storage
- `notification` (INotification) - Notification service
- `socket` (ISocket) - Socket.IO
- `databaseMapper` (IDatabaseMapper) - Database transactions

---

### Creating New Infrastructure Service

**When to create**: External dependencies (APIs, third-party services, new databases)

#### Step 1: Define Interface

**Location**: `src/application/interfaces/{service-name}.interface.ts`

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from './base.interface';

export interface IMyService extends IBaseInfrastructureService {
  serviceName(): 'myService';
  singleton(): true; // or false
  deferred(): false; // or true

  /**
   * Service-specific methods
   */
  doSomething(param: string): Promise<void>;
  getSomething(): Promise<string>;
}
```

#### Step 2: Create Driver Config

**Location**: `src/infrastructure/{service}/driver/{driver-name}.config.ts`

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDriverConfig } from '@/infrastructure/core/driver/core.driver.config';

export interface IMyDriverConfig extends IDriverConfig {
  params: {
    apiKey: string;
    endpoint: string;
    timeout?: number;
    // ... other config
  };
}

export const myDriverConfig = (): IMyDriverConfig => {
  return {
    driverName: 'myDriver',
    singleton: true,
    deferred: false,
    params: {
      apiKey: process.env.MY_SERVICE_API_KEY || '',
      endpoint: process.env.MY_SERVICE_ENDPOINT || 'https://api.example.com',
      timeout: parseInt(process.env.MY_SERVICE_TIMEOUT || '5000', 10),
    },
  };
};
```

#### Step 3: Create Driver

**Location**: `src/infrastructure/{service}/driver/{driver-name}.driver.ts`

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICoreDriver, IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import type { IMyDriverConfig } from './{driver-name}.config';
import type { MyClient } from 'my-client-library'; // Third-party client

export class MyDriver implements ICoreDriver<MyClient, IMyDriverConfig> {
  private _config: IMyDriverConfig;
  private _client: MyClient | undefined;

  constructor(config: IMyDriverConfig) {
    this._config = config;
  }

  async init(): Promise<void> {
    try {
      // Initialize third-party client
      this._client = new MyClient(this._config.params);
      await this._client.connect();
    } catch (error) {
      throw new InfrastructureError(
        `Failed to initialize MyDriver: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  public config(): IMyDriverConfig {
    return this._config;
  }

  client(): MyClient | undefined {
    return this._client;
  }

  async shutdown(): Promise<void> {
    if (this._client) {
      await this._client.disconnect();
    }
  }

  async health(): Promise<IDriverHealthStatus> {
    try {
      if (!this._client) {
        return { connected: false, error: 'Client not initialized' };
      }

      const start = process.hrtime.bigint();
      await this._client.ping();
      const end = process.hrtime.bigint();
      const latency = Number((end - start) / BigInt(1000000));

      return { connected: true, latency };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

#### Step 4: Create Driver Loader

**Location**: `src/infrastructure/{service}/driver/{driver-name}.driver.loader.ts`

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { myDriverConfig } from './{driver-name}.config';
import { MyDriver } from './{driver-name}.driver';

export const myDriverLoader = async (): Promise<MyDriver> => {
  const driver = new MyDriver(myDriverConfig());
  await driver.init();
  return driver;
};
```

#### Step 5: Create Service Implementation

**Location**: `src/infrastructure/{service}/{service-name}.service.ts`

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IMyService } from '@/application/interfaces/{service-name}.interface';

import type { MyDriver } from './driver/{driver-name}.driver';
import type { MyClient } from 'my-client-library';

export class MyService implements IMyService {
  private readonly driver: MyDriver;
  private readonly client: MyClient;

  constructor(driver: MyDriver) {
    this.driver = driver;
    const client = this.driver.client();
    if (!client) {
      throw new Error('Invalid client provided to MyService');
    }
    this.client = client;
  }

  serviceName(): 'myService' {
    return 'myService';
  }

  singleton(): true {
    return true;
  }

  deferred(): false {
    return false;
  }

  getDriver(): MyDriver {
    return this.driver;
  }

  async doSomething(param: string): Promise<void> {
    await this.client.doOperation(param);
  }

  async getSomething(): Promise<string> {
    return await this.client.getOperation();
  }

  async shutdown(): Promise<void> {
    await this.driver.shutdown();
  }
}
```

#### Step 6: Create Service Factory

**Location**: `src/infrastructure/{service}/{service-name}-service.factory.ts`

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IMyService } from '@/application/interfaces/{service-name}.interface';

import { MyService } from './{service-name}.service';
import { myDriverLoader } from './driver/{driver-name}.driver.loader';
import { InfrastructureError } from '../core/errors/infrastructure.error';

import type { IServiceFactory } from '../core/interfaces/service.factory.interface';

export type MyServiceDriverType = 'myDriver' | 'alternativeDriver';

export class MyServiceFactory implements IServiceFactory<IMyService> {
  private isMyServiceDriverType(value: string): value is MyServiceDriverType {
    return ['myDriver', 'alternativeDriver'].includes(value);
  }

  async createMyService(): Promise<IMyService> {
    return new MyService(await myDriverLoader());
  }

  async create(): Promise<IMyService> {
    const envDriver = process.env.MY_SERVICE_DRIVER || 'myDriver';

    if (!this.isMyServiceDriverType(envDriver)) {
      throw new InfrastructureError(`Invalid driver: ${envDriver}`);
    }

    const driverType: MyServiceDriverType = envDriver;
    switch (driverType) {
      case 'myDriver':
        return this.createMyService();

      case 'alternativeDriver':
        throw new InfrastructureError('Alternative driver not yet implemented');

      default:
        throw new InfrastructureError(`Unsupported driver: ${driverType}`);
    }
  }
}
```

#### Step 7: Create Index Export

**Location**: `src/infrastructure/{service}/index.ts`

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export { MyServiceFactory } from './{service-name}-service.factory';
```

#### Step 8: Register in Infrastructure Loader

**Location**: `src/infrastructure/infrastructure.loader.ts`

```typescript
import { MyServiceFactory } from './{service}'; // ADD THIS

export const infrastructureLoader: InfrastructureFactoryClass[] = [
  CacheServiceFactory,
  EmailServiceFactory,
  LoggerServiceFactory,
  NotificationServiceFactory,
  DatabaseMapperServiceFactory,
  QueueServiceFactory,
  SocketServiceFactory,
  StorageServiceFactory,
  MyServiceFactory, // ADD THIS
];
```

---

## Middleware

### Using Existing Middleware

**RequestValidatorMiddleware**: Validates request data using express-validator schemas

```typescript
import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { myValidator } from '@/presentation/http/validators/{feature}/{validator}';

router.post('/endpoint', RequestValidatorMiddleware(myValidator()), (req: Request, res: Response) => {
  // Handler
});
```

**UserValidatorMiddleware**: Authenticates users via JWT tokens

```typescript
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

router.get(
  '/protected',
  UserValidatorMiddleware(() => container.resolve<LoginService>('loginService')),
  (req: AuthenticatedRequest, res: Response) => {
    // req.user is now available
    const user = req.user;
  },
);
```

---

### Creating Custom Middleware

**When to create**: Cross-cutting concerns (rate limiting, feature flags, custom auth, etc.)

**Location**: `src/presentation/http/middleware/{MiddlewareName}Middleware.ts`

**Pattern**:

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import APIResponseUtils from '@/app/core/utils/api-response/api-response-utils';

import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware description
 *
 * @param {SomeType} config - Configuration or dependencies
 * @returns {Function} Express middleware function
 */
export const MyCustomMiddleware = (config: SomeType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Middleware logic
      const isValid = await validateSomething(req, config);

      if (!isValid) {
        const apiResponse = APIResponseUtils.apiErrorResponse(403, 'Validation failed');
        res.status(apiResponse.getCode()).send(apiResponse.toJson());
        return;
      }

      // Continue to next middleware/handler
      next();
    } catch (error) {
      const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
      res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }
  };
};
```

**Using DI Container in Middleware**:

```typescript
import { container } from '@/app/core/service.container';
import type { ILogger } from '@/application/interfaces/logger.interface';

export const LoggingMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.resolve<ILogger>('logger');
    logger.logInfo(`${req.method} ${req.path}`);
    next();
  };
};
```

**Conventions**:

- Export as named function returning middleware
- Use dependency injection via function parameters
- Handle errors gracefully
- Return appropriate HTTP responses
- Use `APIResponseUtils` for consistent responses

---

## Complete Example: Blog Post Feature

### 1. Domain Model

`src/domain/blog/models/post.ts`:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

type PostStatus = 'draft' | 'published' | 'archived';

export interface INewPost {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  status: PostStatus;
  tags?: string[];
}

export interface IPost extends INewPost {
  id: string;
}

export class NewPost extends DomainEntity {
  protected _id?: string;
  protected _title: string;
  protected _content: string;
  protected _authorId: string;
  protected _status: PostStatus;
  protected _tags: string[];

  constructor(data: INewPost) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._title = data.title;
    this._content = data.content;
    this._authorId = data.authorId;
    this._status = data.status;
    this._tags = data.tags || [];
  }

  get id(): string | undefined {
    return this._id;
  }
  get title(): string {
    return this._title;
  }
  get content(): string {
    return this._content;
  }
  get authorId(): string {
    return this._authorId;
  }
  get status(): PostStatus {
    return this._status;
  }
  get tags(): string[] {
    return this._tags;
  }

  set id(value: string) {
    this._id = value;
  }
  set title(value: string) {
    this._title = value;
  }
  set content(value: string) {
    this._content = value;
  }
  set authorId(value: string) {
    this._authorId = value;
  }
  set status(value: PostStatus) {
    this._status = value;
  }
  set tags(value: string[]) {
    this._tags = value;
  }
}

export class Post extends NewPost {
  protected _id: string;

  constructor(data: IPost) {
    super(data);
    this._id = data.id;
  }

  get id(): string {
    return this._id;
  }

  isPublished(): boolean {
    return this._status === 'published';
  }

  publish(): void {
    this._status = 'published';
  }
}

// Default export required for potential future use
export default Post;
```

### 2. Mongoose Schema

`src/infrastructure/persistance/database/repositories/mongoose/blog/post.model.ts`:

```typescript
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

type PostStatus = 'draft' | 'published' | 'archived';

export interface INewPostSchema {
  _id?: Types.ObjectId;
  title: string;
  content: string;
  authorId: string;
  status: PostStatus;
  tags: string[];
}

export const PostSchema = new Schema<INewPostSchema>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      required: true,
      default: 'draft',
    },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

export const PostModel = model('post', PostSchema);
```

### 3. Mapper

`src/infrastructure/persistance/database/repositories/mongoose/blog/post.mapper.ts`:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewPost } from '@/domain/blog/models/post';
import { Post } from '@/domain/blog/models/post';

import { BaseMapper } from '../base/base.mapper';
import type { INewPostSchema } from './post.model';

export class PostMapper extends BaseMapper<INewPostSchema, Post, NewPost> {
  toDomain(data: INewPostSchema & { _id: Types.ObjectId }): Post {
    return new Post({
      id: data._id.toString(),
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      status: data.status,
      tags: data.tags,
    });
  }

  toPersistence(data: NewPost): INewPostSchema {
    return !data.id
      ? {
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          status: data.status,
          tags: data.tags,
        }
      : {
          _id: new Types.ObjectId(data.id),
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          status: data.status,
          tags: data.tags,
        };
  }
}
```

### 4. Repository

`src/infrastructure/persistance/database/repositories/mongoose/blog/post.repository.ts`:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Post, NewPost } from '@/domain/blog/models/post';

import { BaseRepository } from '../base/base-repository';
import { PostMapper } from './post.mapper';
import { PostModel } from './post.model';

import type { INewPostSchema } from './post.model';

export class PostRepository extends BaseRepository<INewPostSchema, Post, NewPost> {
  constructor() {
    super(PostModel, new PostMapper());
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    return await this.find({ authorId });
  }

  async findPublished(limit?: number): Promise<Post[]> {
    return await this.find({ status: 'published' }, limit);
  }
}

export default PostRepository;
```

### 5. Domain Service

`src/domain/blog/service/post.service.ts`:

```typescript
/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { IPostRepository } from '@/application/interfaces/repositories/blog/post.repository.interface';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

import { NewPost, type Post } from '../models/post';
import type { INewPost } from '../models/post';

export class PostService extends BaseDomainService {
  private readonly postRepository: IPostRepository;

  constructor(postRepository: IPostRepository) {
    super();
    this.postRepository = postRepository;
  }

  /**
   * Create a new post in draft status.
   *
   * @param {INewPost} data - Post creation data
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Post>} The newly created post
   */
  async create(data: INewPost, transactionOptions?: TransactionOptions): Promise<Post> {
    return this.wrapInfrastructureErrors<Post>(async () => {
      const newPost = new NewPost({ ...data, status: 'draft' });
      return await this.postRepository.create(newPost, transactionOptions);
    });
  }

  /**
   * Retrieve a post by its ID.
   *
   * @param {string} id - Post ID
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Post>} The found post
   * @throws {DomainServiceError} NOT_FOUND when the post does not exist
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<Post> {
    return this.wrapInfrastructureErrors<Post>(async () => {
      const post = await this.postRepository.findById(id, transactionOptions);
      if (!post) {
        throw new DomainServiceError('Post not found', 'NOT_FOUND');
      }
      return post;
    });
  }

  /**
   * Retrieve all posts with optional pagination.
   *
   * @param {number} limit - Maximum number of posts to return
   * @param {number} offset - Number of posts to skip
   * @returns {Promise<Post[]>} Array of posts
   */
  async getAll(limit?: number, offset?: number): Promise<Post[]> {
    return this.wrapInfrastructureErrors<Post[]>(async () => {
      return await this.postRepository.find({}, limit, offset);
    });
  }

  /**
   * Count total posts matching an optional filter.
   *
   * @param {Partial<INewPost>} filter - Optional filter criteria
   * @returns {Promise<number>} Total count
   */
  async count(filter: Partial<INewPost> = {}): Promise<number> {
    return this.wrapInfrastructureErrors<number>(async () => {
      return await this.postRepository.count(filter);
    });
  }

  /**
   * Retrieve all posts by a given author.
   *
   * @param {string} authorId - Author user ID
   * @returns {Promise<Post[]>} Array of the author's posts
   */
  async getByAuthor(authorId: string): Promise<Post[]> {
    return this.wrapInfrastructureErrors<Post[]>(async () => {
      return await this.postRepository.findByAuthor(authorId);
    });
  }

  /**
   * Retrieve published posts with optional limit.
   *
   * @param {number} limit - Maximum number of posts to return
   * @returns {Promise<Post[]>} Array of published posts
   */
  async getPublished(limit?: number): Promise<Post[]> {
    return this.wrapInfrastructureErrors<Post[]>(async () => {
      return await this.postRepository.findPublished(limit);
    });
  }

  /**
   * Publish a post, restricted to the post's author.
   *
   * @param {string} id - Post ID
   * @param {string} authorId - ID of the requesting user
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Post>} The published post
   * @throws {DomainServiceError} NOT_FOUND when the post does not exist
   * @throws {DomainServiceError} USER_PERMISSION_ERROR when the requester is not the author
   */
  async publish(id: string, authorId: string, transactionOptions?: TransactionOptions): Promise<Post> {
    return this.wrapInfrastructureErrors<Post>(async () => {
      const post = await this.getById(id, transactionOptions);

      if (post.authorId !== authorId) {
        throw new DomainServiceError('You are not authorized to publish this post', 'USER_PERMISSION_ERROR');
      }

      post.publish();
      const updated = new NewPost({
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.authorId,
        status: post.status,
        tags: post.tags,
      });

      const result = await this.postRepository.update(id, updated, transactionOptions);
      if (!result) {
        throw new DomainServiceError('Post not found', 'NOT_FOUND');
      }
      return result;
    });
  }

  /**
   * Update a post, restricted to the post's author.
   *
   * @param {string} id - Post ID
   * @param {Partial<INewPost>} data - Fields to update
   * @param {string} authorId - ID of the requesting user
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Post>} The updated post
   * @throws {DomainServiceError} NOT_FOUND when the post does not exist
   * @throws {DomainServiceError} USER_PERMISSION_ERROR when the requester is not the author
   */
  async update(
    id: string,
    data: Partial<INewPost>,
    authorId: string,
    transactionOptions?: TransactionOptions,
  ): Promise<Post> {
    return this.wrapInfrastructureErrors<Post>(async () => {
      const existing = await this.getById(id, transactionOptions);

      if (existing.authorId !== authorId) {
        throw new DomainServiceError('You are not authorized to update this post', 'USER_PERMISSION_ERROR');
      }

      const updated = new NewPost({
        id: existing.id,
        title: data.title ?? existing.title,
        content: data.content ?? existing.content,
        authorId: existing.authorId,
        status: data.status ?? existing.status,
        tags: data.tags ?? existing.tags,
      });

      const result = await this.postRepository.update(id, updated, transactionOptions);
      if (!result) {
        throw new DomainServiceError('Post not found', 'NOT_FOUND');
      }
      return result;
    });
  }

  /**
   * Delete a post, restricted to the post's author.
   *
   * @param {string} id - Post ID
   * @param {string} authorId - ID of the requesting user
   * @param {TransactionOptions} transactionOptions - Optional transaction session
   * @returns {Promise<Post>} The deleted post
   * @throws {DomainServiceError} NOT_FOUND when the post does not exist, or when the delete itself fails
   * @throws {DomainServiceError} USER_PERMISSION_ERROR when the requester is not the author
   */
  async delete(id: string, authorId: string, transactionOptions?: TransactionOptions): Promise<Post> {
    return this.wrapInfrastructureErrors<Post>(async () => {
      const post = await this.getById(id, transactionOptions);

      if (post.authorId !== authorId) {
        throw new DomainServiceError('You are not authorized to delete this post', 'USER_PERMISSION_ERROR');
      }

      const deleted = await this.postRepository.delete(id, transactionOptions);
      if (!deleted) {
        throw new DomainServiceError('Post could not be deleted', 'NOT_FOUND');
      }
      return deleted;
    });
  }
}

export default PostService;
```

### 6. Validators

`src/presentation/http/validators/blog/post.validator.ts`:

```typescript
import type { Schema } from 'express-validator';

export const newPostValidator = (): Schema => {
  return {
    title: {
      notEmpty: true,
      isString: true,
      isLength: {
        options: { min: 3, max: 200 },
      },
      errorMessage: 'Title must be between 3 and 200 characters',
    },
    content: {
      notEmpty: true,
      isString: true,
      errorMessage: 'Content is required',
    },
    tags: {
      optional: true,
      isArray: true,
      errorMessage: 'Tags must be an array',
    },
  };
};

export const updatePostValidator = (): Schema => {
  return {
    title: {
      optional: true,
      isString: true,
      isLength: {
        options: { min: 3, max: 200 },
      },
    },
    content: {
      optional: true,
      isString: true,
    },
    status: {
      optional: true,
      isIn: {
        options: [['draft', 'published', 'archived']],
      },
    },
    tags: {
      optional: true,
      isArray: true,
    },
  };
};
```

### 7. Controller

`src/presentation/http/controllers/blog/post.controller.ts`:

```typescript
/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { PostService } from '@/domain/blog/service/post.service';
import type { PostRepository } from '@/infrastructure/persistance/database/repositories/mongoose/blog/post.repository';
import type { INewPost } from '@/domain/blog/models/post';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

// Note: `req.user!` below is the pre-approved AuthenticatedRequest exception to the Type
// Assertions Policy — UserValidatorMiddleware guarantees req.user is populated by the time a
// controller runs, but AuthenticatedRequest.user stays optional in the type. No need to ask
// before reusing this exact pattern; any other assertion in this controller still requires asking.
export class PostController extends BaseController {
  private postService: PostService;
  private postRepository: PostRepository;

  constructor(postService: PostService, postRepository: PostRepository) {
    super();
    this.postService = postService;
    this.postRepository = postRepository;
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<Omit<INewPost, 'authorId'>>(req);
      const result = await this.postService.create({
        ...data,
        authorId: req.user!.id,
        status: 'draft',
      });

      return ApiResponseUtils.apiOkResponse(201, false, null, 'Post created successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async getAll(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      // Get total count from repository
      const totalCount = await this.postRepository.count({});

      // getPaginator validates parameters and throws PaginationException if invalid
      const paginator = this.getPaginator(req, totalCount);

      const items = await this.postService.getAll(paginator.getLimit(), paginator.getOffset());

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Posts retrieved successfully', {
        items,
        pagination: {
          page: paginator.getCurrentPage(),
          limit: paginator.getLimit(),
          total: totalCount,
          totalPages: paginator.getTotalPages(),
        },
      });
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;
      const result = await this.postService.getById(id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Post retrieved successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async getPublished(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
      const result = await this.postService.getPublished(limit);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Posts retrieved successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async getMyPosts(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.postService.getByAuthor(req.user!.id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Posts retrieved successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async publish(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;
      const result = await this.postService.publish(id, req.user!.id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Post published successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;
      const data = matchedData<Partial<INewPost>>(req);
      const result = await this.postService.update(id, data, req.user!.id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Post updated successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { id } = req.params;
      await this.postService.delete(id, req.user!.id);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Post deleted successfully', null);
    });

    return ApiResponseUtils.createResponse(response, res);
  }
}

export default PostController;
```

### 8. Routes

`src/presentation/http/routes/blog.routes.ts`:

```typescript
import { Router } from 'express';

import { newPostValidator, updatePostValidator } from '@/presentation/http/validators/blog/post.validator';
import { container } from '@/app/core/service.container';
import type { LoginService } from '@/domain/auth/service/login.service';

import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';

import type { PostController } from '../controllers/blog/post.controller';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

const router = Router();

// All routes require authentication
const loginServiceProvider = () => container.resolve<LoginService>('loginService');

// Get all posts (paginated)
router.get(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.getAll(req, res);
  },
);

// Get published posts
router.get(
  '/published',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.getPublished(req, res);
  },
);

// Get my posts
router.get(
  '/my/posts',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.getMyPosts(req, res);
  },
);

// Get post by ID
router.get(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.getById(req, res);
  },
);

// Create new post
router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(newPostValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.create(req, res);
  },
);

// Publish post
router.post(
  '/:id/publish',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.publish(req, res);
  },
);

// Update post
router.put(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(updatePostValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.update(req, res);
  },
);

// Delete post
router.delete(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    const controller = container.resolve<PostController>('postController');
    controller.delete(req, res);
  },
);

export { router as BlogRoutes };
```

### 9. Register Routes

In `src/presentation/http/routes/index.ts`:

```typescript
import { BlogRoutes } from './blog.routes';

router.use('/posts', BlogRoutes);
```

---

## Checklist for New Endpoint

- [ ] Define domain model (`src/domain/{feature}/models/`) with default export
- [ ] Type guard file (`src/domain/{feature}/models/guards/{model-name}.guards.ts`) — only if narrowing is needed
- [ ] Create Mongoose schema (`src/infrastructure/persistance/.../mongoose/{feature}/*.model.ts`)
- [ ] Create mapper (`src/infrastructure/persistance/.../mongoose/{feature}/*.mapper.ts`)
- [ ] Create repository with default export (`src/infrastructure/persistance/.../mongoose/{feature}/*.repository.ts`)
- [ ] Create domain service with default export (`src/domain/{feature}/service/*.service.ts`)
  - [ ] Add error checking for model existence in all getById methods
  - [ ] Add getAll and count methods for pagination support
- [ ] Create application service if needed with default export (`src/application/services/{feature}/`)
- [ ] Create validators (`src/presentation/http/validators/{feature}/`)
- [ ] Create controller with default export (`src/presentation/http/controllers/{feature}/`)
  - [ ] Inject repository in constructor for direct access to count()
  - [ ] Add getAll method with pagination using getPaginator
  - [ ] Use catchExceptionsWrapper for all methods
- [ ] Create routes (`src/presentation/http/routes/{feature}.routes.ts`)
  - [ ] Add UserValidatorMiddleware to ALL routes
  - [ ] Use AuthenticatedRequest type for all route handlers
- [ ] Register routes in main router (`src/presentation/http/routes/index.ts`)
- [ ] Create/update seeder if the resource has default or bootstrap data (`src/infrastructure/persistance/database/seeders/{feature}.seeder.ts`), registered by hand in `seeders/seeder.ts` — see `Database_Seeding_Guide.md`
- [ ] Test endpoints

> ⚠️ **Keep the file set in sync.** The domain model is the source of truth for a resource's
> shape (this list mirrors the file set enumerated in `Docs/architecture/infrastructure-layer-pattern.md`
> and `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`). Any change to it — adding, removing,
> renaming, or retyping a field, or changing a validation invariant — is **not complete** until it
> has been propagated through every other file in the set that touches the changed field:
>
> - **Persistence model/schema** — add/remove/rename the corresponding schema field and its type
> - **Persistence mapper** — update `toDomain`/`toPersistence` for the field
> - **Persistence repository** — update any custom queries, filters, or indexes that reference the field
> - **Validator** — update the express-validator schema for the field
> - **Controller** — update request/response shape (DTOs, serialized fields) that exposes the field
> - **Seeder** — update default/bootstrap data to match the new shape, if the resource has a seeder
>
> A change that touches only the domain model is incomplete. Treat "the domain model changed" as a
> trigger to grep the resource's other files (route, controller, application service, domain
> service, mapper, persistence model, repository, seeder) for the affected field name before
> considering the work done.

---

## ❗ VALIDATION CHECKPOINT - DID YOU FOLLOW THE GUIDE? ❗

### 🚫 STOP - Before Moving Forward

You've completed the step-by-step implementation. **Now validate everything**:

#### ✅ Compliance Checklist:

**For EVERY file you created, verify:**

1. **Schema Files** (`*.model.ts`):
   - [ ] Contains ONLY `INew{Model}Schema` interface
   - [ ] Does NOT have `I{Model}Schema` or `I{Model}` interfaces extending it
   - [ ] Matches the guide's pattern exactly
   - [ ] If you added extra interfaces → **WRONG - Remove them NOW**

2. **Mapper Files** (`*.mapper.ts`):
   - [ ] Uses `INew{Model}Schema & { _id: Types.ObjectId }` parameter type
   - [ ] Does NOT reference `I{Model}Schema` from infrastructure
   - [ ] Imports domain interfaces only for return types
   - [ ] If you created infrastructure interfaces for this → **WRONG - Use intersection types**

3. **Repository Files** (`*.repository.ts`):
   - [ ] Extends BaseRepository with correct generics
   - [ ] Exports as default
   - [ ] Does NOT create workaround interfaces
   - [ ] If you added any type assertion (`as`, `<Type>`, or `!`) → confirm it's one of the
         pre-approved exceptions in the Type Assertions Policy (`CLAUDE.md` §24 / `AGENTS.md`), or
         **ASK** the user first

4. **Service Files** (`*.service.ts`):
   - [ ] Extends BaseDomainService
   - [ ] Uses DomainServiceError
   - [ ] Validates entity existence from repository
   - [ ] Returns correct shape (`{ id }` for mutations, domain models for queries)
   - [ ] Exports as default

5. **Domain Model Files** (`models/*.ts`):
   - [ ] Has `INew{Model}` (id optional) and `I{Model} extends INew{Model}` (id required)
   - [ ] `New{Model}` extends `DomainEntity` and calls `super()` in constructor
   - [ ] Has `New{Model}` class and `{Model}` class extending it
   - [ ] Includes business logic methods
   - [ ] Invariant violations in constructors/setters throw `DomainEntityError` — **never plain `Error`**
   - [ ] Does NOT throw `DomainServiceError` — that belongs in services only
   - [ ] If you put these interfaces in infrastructure → **WRONG - Move to domain**

#### 🚨 Red Flags - If ANY are true, STOP and FIX:

⚠️ "I created interfaces in infrastructure to fix TypeScript errors"  
⚠️ "I copied patterns from existing files instead of the guide"  
⚠️ "I modified the pattern because I thought it was better"  
⚠️ "I'm not 100% sure this matches the guide"  
⚠️ "I made assumptions instead of asking questions"  
⚠️ "I skipped some validation steps"

**If ANY red flag is true** → Go back to the relevant section and fix it NOW.

#### ❓ Questions You Should Ask Yourself:

1. Can I explain WHY each interface exists in its specific layer?
2. Can I justify EVERY deviation from the guide's examples?
3. Did I validate against the guide, not against existing code?
4. Would this pass a strict code review by a senior engineer?
5. Am I certain this follows enterprise code standards?

**If you answered "No" or "Maybe" to any** → Review and fix before proceeding.

### 🎯 Final Reminder:

> **"Working code that doesn't follow the guide is technical debt, not success."**
>
> **"When existing code conflicts with the guide, the guide wins."**
>
> **"If you're uncertain, you're not done - ask or review."**

---

## Common Patterns

### Pagination

**Use BaseController's `getPaginator()` method**:

```typescript
/**
 * Get all models with pagination
 *
 * @param {Request} req - The incoming request object
 * @param {Response} res - The response object
 * @returns {Promise<Response>}
 */
async getAll(req: Request, res: Response): Promise<Response> {
  const response = await this.catchExceptionsWrapper(async () => {
    // Get total count from repository
    const totalCount = await this.modelRepository.count({});

    // getPaginator validates page/limit parameters and throws PaginationException if invalid
    const paginator = this.getPaginator(req, totalCount);

    // Fetch paginated results using offset and limit from paginator
    const items = await this.modelService.getAll(
      paginator.getLimit(),
      paginator.getOffset()
    );

    return ApiResponseUtils.apiOkResponse(200, false, null, 'Success', {
      items,
      pagination: {
        page: paginator.getCurrentPage(),
        limit: paginator.getLimit(),
        total: totalCount,
        totalPages: paginator.getTotalPages(),
      },
    });
  });

  return ApiResponseUtils.createResponse(response, res);
}
```

**Note**: Filtering is not yet implemented in the presentation layer. Focus on pagination for now.

### File Upload

```typescript
import type { IStorage } from '@/application/interfaces/storage.interface';

async uploadFile(req: Request, res: Response): Promise<Response> {
  const response = await this.catchExceptionsWrapper(async () => {
    const file = req.file; // Assuming multer middleware
    if (!file) {
      throw new DomainServiceError('No file uploaded', 'VALIDATION_ERROR');
    }

    const storage = container.resolve<IStorage>('storage');
    const filePath = await storage.upload(file.buffer, file.originalname);

    return ApiResponseUtils.apiOkResponse(201, false, null, 'File uploaded', {
      path: filePath,
    });
  });

  return ApiResponseUtils.createResponse(response, res);
}
```

---

## Environment Configuration

Always add new environment variables to `.env.{environment}` files:

```env
# Example: New service configuration
MY_SERVICE_DRIVER=myDriver
MY_SERVICE_API_KEY=your-api-key
MY_SERVICE_ENDPOINT=https://api.example.com
MY_SERVICE_TIMEOUT=5000
```

---

## Error Handling

The application handles errors at multiple levels with a well-defined flow:

### Error Flow

```
Domain Service throws DomainServiceError
    ↓
Controller's catchExceptionsWrapper catches it
    ↓
BaseController.getServiceErrorResponse() maps error type to HTTP response
    ↓
ApiResponseUtils creates appropriate response
    ↓
Client receives proper HTTP status code and message
```

### Error Types and HTTP Status Mapping

**DomainServiceError Types** (thrown in domain services):

| Error Type                | HTTP Status | Use Case                                |
| ------------------------- | ----------- | --------------------------------------- |
| `'AUTHENTICATION_ERROR'`  | 401         | Invalid credentials, token expired      |
| `'USER_PERMISSION_ERROR'` | 403         | User not authorized for action          |
| `'NOT_FOUND'`             | 404         | Resource doesn't exist                  |
| `'ALREADY_EXISTS'`        | 400         | Duplicate resource (e.g., email exists) |
| `'VALIDATION_ERROR'`      | 400         | Business rule validation failed         |
| `'INCOMPLETE_MODEL'`      | 400         | Required fields missing                 |
| `'UNKNOWN_ERROR'`         | 500         | Unexpected server error                 |

### Error Handling in Domain Services

**Always check for model existence**:

```typescript
async getById(id: string): Promise<Model> {
  const model = await this.modelRepository.findById(id);

  // REQUIRED: Check if model exists
  if (!model) {
    throw new DomainServiceError('Model not found', 'NOT_FOUND');
  }

  return model;
}
```

**Business validation errors**:

```typescript
async create(data: INewModel): Promise<Model> {
  // Check for duplicates
  const existing = await this.modelRepository.findOne({ name: data.name });
  if (existing) {
    throw new DomainServiceError(
      'Model with this name already exists',
      'ALREADY_EXISTS'
    );
  }

  // Business logic...
}
```

**Permission errors**:

```typescript
async update(id: string, data: Partial<INewModel>, userId: string): Promise<Model> {
  const model = await this.getById(id);

  // Check ownership/permission
  if (model.ownerId !== userId) {
    throw new DomainServiceError(
      'You are not authorized to update this model',
      'USER_PERMISSION_ERROR'
    );
  }

  // Update logic...
}
```

### Error Handling in Controllers

**All controller methods must use `catchExceptionsWrapper`**:

```typescript
async create(req: Request, res: Response): Promise<Response> {
  // catchExceptionsWrapper automatically:
  // 1. Catches DomainServiceError
  // 2. Catches PaginationException
  // 3. Calls getServiceErrorResponse() for DomainServiceError
  // 4. Returns appropriate HTTP response
  const response = await this.catchExceptionsWrapper(async () => {
    const data = matchedData<INewModel>(req);
    const result = await this.modelService.create(data);

    return ApiResponseUtils.apiOkResponse(
      201,
      false,
      null,
      'Model created successfully',
      result
    );
  });

  return ApiResponseUtils.createResponse(response, res);
}
```

**Pagination with getPaginator** (automatically validates parameters):

```typescript
async getAll(req: Request, res: Response): Promise<Response> {
  const response = await this.catchExceptionsWrapper(async () => {
    // Get total count from repository
    const totalCount = await this.modelRepository.count({});

    // getPaginator validates page/limit parameters automatically
    // Throws PaginationException if missing or invalid (caught by catchExceptionsWrapper)
    const paginator = this.getPaginator(req, totalCount);

    // Fetch data
    const items = await this.modelService.getAll(paginator.getLimit(), paginator.getOffset());

    return ApiResponseUtils.apiOkResponse(200, false, [], 'Success', {
      items,
      pagination: {
        page: paginator.getCurrentPage(),
        limit: paginator.getLimit(),
        total: totalCount,
        totalPages: paginator.getTotalPages(),
      },
    });
  });

  return ApiResponseUtils.createResponse(response, res);
}
```

### How catchExceptionsWrapper Works

From `BaseController`:

```typescript
protected async catchExceptionsWrapper(
  callback: () => Promise<APIResponse>
): Promise<APIResponse> {
  try {
    return await callback();
  } catch (e: unknown) {
    // Handles pagination errors
    if (e instanceof PaginationException) {
      this.logErrors(e);
      return ApiResponseUtils.apiErrorResponse(400, e.message);
    }

    // Handles domain service errors - maps to appropriate HTTP status
    if (e instanceof DomainServiceError) {
      this.logErrors(e);
      return this.getServiceErrorResponse(e);
    }

    // Handles unexpected errors
    this.logErrors(e);
    return ApiResponseUtils.getServerErrorAPIResponse();
  }
}
```

### PaginationException

Thrown by `BaseController.getPaginator()` when:

- Page number is missing or invalid
- Limit is missing or invalid
- Page number is <= 0
- Limit is <= 0

**Automatically caught by `catchExceptionsWrapper`** and converted to 400 response.

### Infrastructure Errors

For infrastructure layer failures (database connection, cache errors, etc.):

```typescript
throw new InfrastructureError('Redis connection failed');
```

### Error Handling Layers

1. **Domain Layer**: Throw `DomainServiceError` for business rule violations
2. **Controller Layer**: `catchExceptionsWrapper` catches all errors and converts to HTTP responses
3. **Middleware Layer**: Try-catch with `ApiResponseUtils` for consistent responses
4. **Infrastructure Layer**: `InfrastructureError` for service failures

### Best Practices

1. **Always check model existence** in domain service getById methods
2. **Use specific error types** - don't use generic 'UNKNOWN_ERROR' unless truly unexpected
3. **Provide clear error messages** - help client understand what went wrong
4. **Don't expose internal details** - don't include stack traces or database errors in responses
5. **Log all errors** - catchExceptionsWrapper logs automatically
6. **Let catchExceptionsWrapper handle it** - don't try-catch inside controller methods, it handles parameter validation and errors

---

## Best Practices Summary

1. **Follow the layer pattern**: Presentation → Application → Domain → Infrastructure
2. **Use dependency injection**: Let Awilix handle service creation
3. **Default exports required**: All controllers, services, and repositories must use default export
4. **Type everything**: Leverage TypeScript for type safety
5. **Validate early**: Use validators at the presentation layer
6. **Keep controllers thin**: Business logic belongs in domain services
7. **Always check model existence**: Throw DomainServiceError('...', 'NOT_FOUND') when model not found
8. **Use catchExceptionsWrapper**: Wrap all controller logic to handle errors properly
9. **Authenticate all routes**: Use UserValidatorMiddleware on every route
10. **Inject repositories in controllers**: For direct access to count() and other query methods
11. **Use getPaginator**: Let BaseController handle pagination parameter validation automatically
12. **Use transactions**: For operations that change multiple entities
13. **Document with JSDoc**: Especially for public APIs
14. **Follow naming conventions**: Consistency aids auto-registration
15. **Handle errors gracefully**: Use typed errors (DomainServiceError) and proper HTTP status codes
16. **Test your endpoints**: Ensure they work as expected

---

## End of Guide

This comprehensive guide provides everything an LLM needs to create fully-functional endpoints in the Infinite Node Application, following the established architecture, patterns, and conventions.
