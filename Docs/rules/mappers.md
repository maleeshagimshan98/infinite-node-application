# Schema and mapper rules (§6.1–§6.3, §6.9–§6.11)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

Repository rules (§6.4–§6.8) are in [`repositories.md`](repositories.md).

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

- a sub-document → its schema and mapper follow §6.10 and §6.11; nothing extends `BaseSubDocumentMapper` yet

### 6.9 Name schema fields in snake_case; rename only in the mapper

**Rule:** `INew{Model}Schema` and its Mongoose schema use the same property names, always snake_case. A domain model
property may be camelCase or snake_case; when its name differs from the schema's, only the mapper translates it.
Never put a persistence name in the domain model, or a domain name in the schema.
**Why:** Every rename has one place, so a field can be traced from the API to the database. Today business fields are
snake_case on both sides (`ug_id`, `role_id`, `resource_permissions`), so the only rename is `id` ↔ `_id` (§6.2).
**Reference:** `.../mongoose/resources/resource.mapper.ts`

### 6.10 Call `model()` only for a root document

**Rule:** Only a root document's file creates and exports a Mongoose model. A sub-document's file exports its schema
interface (`INew{Child}Schema`, §12.4) and its `Schema` only, and the parent's schema embeds it
(`items: { type: Map, of: OrderItemSchema }`). The sub-document's schema interface follows §6.1 and §6.9, except that
`_id` is optional (or left out when the child needs no identity) and it has no `__v` (§5.4).
**Why:** A model is a collection. A sub-document kept in a collection of its own is no longer written together with
its root, so the root's `version` property would stop covering it.

### 6.11 Give each sub-document its own mapper, held by its parent's mapper

**Rule:** Each sub-document has its own mapper, which extends
`BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel>` (`.../mongoose/base/base-subdocument.mapper.ts`) and
is held by its parent's mapper as a `private readonly` field (`private readonly itemMapper = new OrderItemMapper()`).
A sub-document mapper holds its own children's mappers the same way. The generics:

- `DBSchema`: the sub-document's schema interface
- `DomainModel`: the child's constructor interface (`INew{Child}`), not its class; the parent builds the instance
  (§5.10)
- `NewDomainModel`: the child's class, which `toPersistence()` receives

`toDomain(data: DBSchema)` has no `& { _id: … }` intersection, because a sub-document may have no `_id`: map the id
only when it is present, `...(data._id && { id: data._id.toString() })`.
**Why:** One mapper per shape keeps each translation testable, and the root mapper stays the only mapper its
repository calls (§6.3).
**Use cases:**

- an embedded collection (a Mongoose `Map` in the schema, a `Record<string, …>` in the domain) → convert it in a
  small private helper that hands each entry to the child mapper. Asserting a hydrated entry to `S & { _id: string }`
  there is pre-approved (§12.6, case 1)
- nothing extends `BaseSubDocumentMapper` yet; `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md` shows an
  illustrative `Order` → `OrderItem`
