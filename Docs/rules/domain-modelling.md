# Domain modelling rules (§5)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

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
  version?: number; // the entity's version property; in an update payload, the version the client read (§5.4, §7.6)
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

### 5.4 Give every root entity a read-only `version` property

**Rule:** Every root entity has `version?` on `INew{Model}` and `version` on `I{Model}`, a `_version` field with a
getter and **no setter**, validated with `DomainEntity.checkVersion()` in both constructors (§5.1).
**Why:** The `version` property holds the document's stored `__v`; only `BaseRepository.update()` increments
`__v`, and the conditional update (§6.8) relies on it to reject stale writes.
**Use cases:**

- a value that is not an integer ≥ 0 → `checkVersion()` throws `DomainEntityError`, so an `{Model}` built from
  untyped JSON without a `version` property fails
- a sub-document → has no `version` property of its own; changing it increments the root document's `__v`. A User's
  `version` property doesn't change when its populated Role changes
- `Object.assign(entity, data)` with `version` in `data` → throws `TypeError` (the `version` property has no setter);
  destructure it first (§7.6)

**Reference:** `src/domain/auth/models/resource.ts`, `src/domain/base/DomainEntity.ts`

### 5.5 Store emails normalized

**Rule:** An entity normalizes an email with `normalizeEmail()` (`src/domain/base/normalize-email.ts`: trimmed,
lowercase) in its constructor and setter, and services normalize before every lookup by email.
**Why:** The unique indexes on email fields (§6.7) compare stored values; `John@x.com` and `john@x.com` would
otherwise be two users. The schema paths also declare `lowercase: true, trim: true`.

### 5.6 Build `New{Model}` from input and `{Model}` from stored data

**Rule:** Data from a request, or made at runtime, becomes a `New{Model}` (built from `INew{Model}`, `id` optional).
Only data read from the database becomes a `{Model}` (built from `I{Model}`, `id` and the `version` property
required), and only the mapper builds it (§6.2). Type each boundary by its context:

| Context                                                 | Type                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| A validated request body; a domain service's `create()` | `INew{Model}`                                                |
| A domain service's `update()` payload                   | `Partial<INew{Model}>`, which carries the client's `version` |
| What a repository or a domain service returns           | `{Model}`                                                    |

**Why:** The two classes are the same entity with different identity guarantees, so code that holds a `{Model}` never
checks for an id or a `version` property.
**Reference:** `src/domain/auth/service/resource.service.ts`

### 5.7 Keep behavior and invariants in the domain model, never in the schema

**Rule:** Business behavior and invariant checks live in the domain model's methods, constructors and setters (e.g.
`Email.markSent()`, `User.hasPermission()`). A Mongoose schema only describes how the data is stored: types,
`required`, enums, defaults, indexes and the email normalization of §5.5.
**Why:** The domain layer stays testable without a database (§2.1), and each rule sits next to the data it guards.
**Use cases:**

- an invalid value or state change → `DomainEntityError` from the model (§5.2)
- a rule that needs other records → the domain service (§7.3)

### 5.8 Let the constructor interface be partial; the constructor completes the model

**Rule:** `INew{Model}` may leave out properties the model can fill itself. The constructor then sets defaults,
derives values from other parameters, or builds child class instances from interface-shaped data (§5.10), so a model
can expose more than its constructor interface asks for. An optional property is assigned only when it is defined
(`exactOptionalPropertyTypes`, as in the §5.1 example).
**Why:** Callers pass only what they know; the model alone guarantees its complete shape.
**Reference:** `src/domain/auth/models/role.ts` (`resources` is optional on `INewRole` and defaults to `[]`)

### 5.9 Store a class-typed property as a sub-document

**Rule:** A property whose type is another domain model (one that extends `DomainEntity`) or any other class instance
is stored as an embedded sub-document, with its own schema and mapper (§6.10, §6.11). A primitive, or a
`Record<string, primitive>`, stays a plain field. When the choice is unclear (the value could stay a plain object, or
the nesting is deep), ask the user before you create models.
**Why:** A class instance needs a mapper to cross into and out of the database; plain data doesn't.
**Use cases:**

- `protected _items: Record<string, NewOrderItem>` → a sub-document. This is illustrative: nothing in the repository
  uses sub-documents yet
- `protected _labels: Record<string, string>` → a plain schema field
- a document in another collection → not a sub-document but a `Types.ObjectId` with `ref` (§6.1, §6.6)

### 5.10 Build child entities in the parent's constructor

**Rule:** A sub-document mapper returns the child's constructor-interface data (`INew{Child}`), never an instance
(§6.11). The root mapper passes that data into the parent model's constructor, which turns each entry into a child
instance (e.g. `new NewOrderItem(v)`).
**Why:** Children are built one way, whether the data comes from a request or from the database, and the parent
checks its own aggregate's invariants.
