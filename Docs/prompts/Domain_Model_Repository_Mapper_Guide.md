# Domain Model, Repository & Data-Mapper Guide (Document Databases / Mongoose)

## Overview

This guide explains how to create the three persistence-facing artifacts for a feature backed by a
document database (MongoDB via Mongoose):

1. **Domain models** — the four-part pattern (`INewX`, `IX`, `NewX`, `X`) with encapsulated domain logic
2. **Persistence models** — the `INew{Model}Schema` interface and its Mongoose `Schema`
3. **Data-mappers** — the translation layer between the two, including **sub-document mappers**

plus the **repository** that ties them together. The `UserGroup` example is real code from this
repository; the `Order` example is an illustrative walkthrough of the aggregate/sub-document
pattern for when a feature needs it. For where these artifacts sit inside the infrastructure
layer (drivers, factories, DI registration), see `Docs/architecture/infrastructure-layer-pattern.md`.

Two worked examples run through the whole guide:

- **UserGroup** — a flat root document (the baseline case; real code in this repository)
- **Order** — an illustrative aggregate with embedded sub-documents (`Order` → `OrderItem` → discounts/tax lines), demonstrating the pattern for when a feature needs it

---

## The Big Picture

```
        DOMAIN LAYER                    INFRASTRUCTURE LAYER
┌─────────────────────────┐   ┌──────────────────────────────────────────┐
│  Domain model            │   │  Mapper          Schema/Model            │
│  (NewX / X classes,      │◄──┤  toDomain()  ◄── Mongoose document       │
│   encapsulated logic,    │   │  toPersistence() ──► Mongoose document   │──► MongoDB
│   validation)            ├──►│        ▲                                 │
└─────────────────────────┘   │        │ used by                          │
                              │  Repository (extends BaseRepository)      │
                              └──────────────────────────────────────────┘
```

File layout for the two worked examples (paths relative to the service root):

| Artifact | Flat example (UserGroup) | Aggregate example (Order) |
|---|---|---|
| Domain model | `src/domain/user/models/user-group.ts` | `src/domain/order/models/order.ts`, `order-item.ts`, `discount-entry.ts`, … |
| Persistence model + schema | `src/infrastructure/persistance/database/repositories/mongoose/user-groups/user-group.model.ts` | `.../mongoose/order/order.model.ts` (root), `order-item.model.ts`, `discount-entry.model.ts` (sub-documents) |
| Mapper | `.../mongoose/user-groups/user-group.mapper.ts` | `.../mongoose/order/order.mapper.ts` (root), `order-item.mapper.ts` (sub-document) |
| Repository | `.../mongoose/user-groups/user-group.repository.ts` | `.../mongoose/order/order.repository.ts` |
| Base classes | `.../mongoose/base/base.mapper.ts`, `base-repository.ts` | plus `base-subdocument.mapper.ts` for sub-documents |

---

## Domain Models

### The Four-Part Pattern

Every domain model consists of two interfaces and two classes:

```typescript
// src/domain/user/models/user-group.ts
export interface INewUserGroup {
  id?: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export interface IUserGroup extends INewUserGroup {
  id: string;
}

export class NewUserGroup extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  protected _description: string;
  protected _discount: number;
  protected _default: boolean;

  constructor(data: INewUserGroup) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._name = data.name;
    this._description = data.description;
    this._discount = data.discount;
    this._default = data.default;
  }

  get id(): string | undefined {
    return this._id;
  }
  // ... remaining getters/setters omitted
}

export class UserGroup extends NewUserGroup {
  protected _id: string;

  constructor(data: IUserGroup) {
    super(data);
    this._id = data.id;
  }

  get id(): string {
    return this._id;
  }
}

export default UserGroup;
```

### Identity Rules

> **RULE**: A domain model constructed from **user data or at runtime** does not contain an id — use
> `NewX` / `INewX` (id optional). A domain model constructed from **database data** always contains
> an id — use `X` / `IX` (id required).

This is why `X extends NewX` only overrides `_id` to a required `string`: the creation context and
the persisted context are the same model with different identity guarantees.

### Property Naming

> **RULE**: Domain model property names may be **camelCase or snake_case**, but database schema
> property names must always be **snake_case**. When the names differ, the data-mapper is the single
> place that maps between them.

In this codebase the business fields currently use snake_case on both sides (`customer_email`,
`ug_id`, `fulfillment_policy`, …), so in practice the only rename the mappers perform is domain `id`
↔ persistence `_id`. If you introduce a camelCase domain property, the rename happens **only**
inside the mapper — never leak persistence names into the domain layer or domain names into the
schema.

### Encapsulated Domain Logic and Validation

> **RULE**: Domain models own their invariants and business behavior. The database schema is **just a
> representation of the data structure** in the database — it carries no logic. Invariant violations
> in constructors/setters throw `DomainEntityError` (never a raw `Error`).

```typescript
// src/domain/order/models/discount-entry.ts
export class DiscountEntry extends DomainEntity {
  // ...
  constructor(data: IDiscountEntry) {
    super();
    if (data.required && data.value === undefined && data.default === undefined) {
      throw new DomainEntityError('Required discount must have a value or default rate');
    }
    if (data.id) this._id = data.id;
    this._name = data.name;
    if (data.value !== undefined) this._value = data.value;
    if (data.default !== undefined) this._default = data.default;
    this._required = data.required;
  }
  // ...
}
```

### The Construction Interface May Be Partial

> **RULE**: The data (and the interface) used to construct a new domain model may not have all the
> properties of the domain model — optional properties are expected in the creation context.

```typescript
// src/domain/order/models/order-item.ts
export interface INewOrderItem {
  id?: string | undefined;
  sku: string;
  quantity: number;
  unit_price: number;
  description?: string | undefined;
  discounts?: Record<string, IDiscountEntry>;
  tax_lines?: Record<string, ITaxLine>;
  custom_fields?: INestedSchemaValue[] | undefined;
  fulfillment_policy?: IFulfillmentPolicy | undefined;
}
```

### The Constructed Model May Have More Than Its Constructor Interface

> **RULE**: The constructed domain model's shape may have **more** properties than the interface used
> to construct it — e.g. default values derived from other constructor parameters, or properties
> constructed from other properties (interface-shaped data upgraded to real child class instances).

`NewOrderItem` receives plain `IDiscountEntry` objects but stores real `DiscountEntry`
instances, and defaults absent records to `{}`:

```typescript
// src/domain/order/models/order-item.ts
constructor(data: INewOrderItem) {
  super();
  if (data.id) this._id = data.id;
  this._sku = data.sku;
  this._quantity = data.quantity;
  // ...
  this._discounts = this.initDiscounts(data.discounts);
  this._tax_lines = this.initTaxLines(data.tax_lines);
  // ...
}

private initValues<T, K>(values: Record<string, T>, classRef: new (value: T) => K): Record<string, K> {
  const init: Record<string, K> = {};
  for (const [key, value] of Object.entries<T>(values)) {
    init[key] = new classRef(value);
  }
  return init;
}
```

> **NOTE**: Fields are `protected _fieldName` with getters (and setters only where mutation is
> needed) because `DomainEntity.toJSON()` auto-serializes all getters, stripping the `_` prefix —
> including recursively for nested `DomainEntity` instances.

---

## Persistence Models (Interface + Schema)

### The Persistence Model Interface

> **RULE**: The persistence model file exports exactly **one** interface: `INew{Model}Schema`. Never
> add `I{Model}Schema extends INew{Model}Schema` or any other extending interface — the mapper
> handles `_id` via an intersection type.

> **RULE**: The persistence model interface may have an **optional `_id`** property. Sub-documents
> may or may not have an `_id` property, depending on whether the embedded entity needs identity.

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/user-groups/user-group.model.ts
export interface INewUserGroupSchema {
  _id?: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}
```

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order-item.model.ts
export interface IOrderItemSchema {
  _id?: Types.ObjectId;
  sku: string;
  quantity: number;
  unit_price: number;
  description?: string;
  discounts?: Map<string, IDiscountEntrySchema>;
  tax_lines?: Map<string, ITaxLineSchema>;
  custom_fields?: INestedSchemaValue[];
  fulfillment_policy?: IFulfillmentPolicySchema;
}
```

### The Schema

> **RULE**: Create the Mongoose schema with the **same property names as the persistence model
> interface** — always snake_case. No renames happen at the schema level.

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/user-groups/user-group.model.ts
export const UserGroupSchema: Schema = new Schema<INewUserGroupSchema>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  discount: { type: Number, required: true },
  default: { type: Boolean, required: true },
});

export const UserGroupModel = mongoose.model<INewUserGroupSchema>('user-group', UserGroupSchema);
```

### Root Documents vs Sub-Documents

> **RULE**: A database model (`model()`) is created **only for the root document**. Sub-documents are
> never created as database models — they are used as sub-document schemas embedded in the root
> document schema.

✅ The root document file exports the `Schema` **and** the `Model`:

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order.model.ts
export const OrderSchema = new Schema<INewOrderSchema>(
  {
    name: { type: String, required: true },
    source: { type: String },
    customer_email: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'FULFILLED'] },
    billing_details: { type: BillingDetailsSchema },
    items: { type: Map, of: OrderItemSchema },
    shipments: { type: Map, of: OrderShipmentSchema },
  },
  { timestamps: true },
);

export const OrderModel = model<INewOrderSchema>('Order', OrderSchema);
```

✅ A sub-document file exports the `Schema` **only** — it is embedded by the parent
(`items: { type: Map, of: OrderItemSchema }` above):

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/discount-entry.model.ts
export const DiscountEntrySchema = new Schema<IDiscountEntrySchema>({
  name: { type: String, required: true },
  value: { type: String },
  default: { type: String },
  required: { type: Boolean, required: true },
});
```

❌ Never do this in a sub-document file:

```typescript
// ❌ WRONG — sub-documents must not become database models
export const DiscountEntryModel = model('discount-entry', DiscountEntrySchema);
```

---

## Data-Mappers (Root Documents)

### The BaseMapper Contract

Root-document mappers extend `BaseMapper`:

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/base/base.mapper.ts
export abstract class BaseMapper<DBSchema, DomainModel, NewDomainModel> implements IBaseMapper<
  DBSchema,
  DomainModel,
  NewDomainModel
> {
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
```

> **RULE**: Concrete root mappers must **extend `BaseMapper`**, never implement `IBaseMapper`
> directly. `toFilter` (the `id → _id` query translation) is inherited — do not override it.

> **RULE**: `toDomain`'s parameter is always the intersection type
> `INew{Model}Schema & { _id: Types.ObjectId }` — a document read back from the database always has
> a real `ObjectId` `_id`, never a plain string. Never create a separate interface for it, and
> always call `.toString()` on `_id` — never assign it directly.

### Flat Mapper Example

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/user-groups/user-group.mapper.ts
export class UserGroupMapper extends BaseMapper<INewUserGroupSchema, UserGroup, NewUserGroup> {
  toDomain(data: INewUserGroupSchema & { _id: Types.ObjectId }): UserGroup {
    return new UserGroup({
      id: data._id.toString(),
      name: data.name,
      description: data.description,
      discount: data.discount,
      default: data.default,
    });
  }

  toPersistence(data: NewUserGroup): INewUserGroupSchema {
    return !data.id
      ? {
          name: data.name,
          description: data.description,
          discount: data.discount,
          default: data.default,
        }
      : {
          _id: data.id,
          name: data.name,
          description: data.description,
          discount: data.discount,
          default: data.default,
        };
  }
}
```

> **RULE**: `toPersistence` omits `_id` when `data.id` is falsy — MongoDB generates the id on insert.

---

## Repositories

> **RULE**: The repository extends `BaseRepository<DBModel, DomainModel, NewDomainModel>`, implements
> its `I{Model}Repository` interface from `application/interfaces/repositories/`, and has
> `export default` at the bottom. Never re-implement CRUD — `create`, `bulkCreate`, `findById`,
> `findOne`, `find`, `count`, `update`, and `delete` are inherited, all accepting an optional
> `TransactionOptions` as the last parameter. Only add feature-specific query methods.

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/user-groups/user-group.repository.ts
export class UserGroupRepository
  extends BaseRepository<INewUserGroupSchema, UserGroup, NewUserGroup>
  implements IUserGroupRepository
{
  constructor() {
    super(UserGroupModel, new UserGroupMapper());
  }
}

export default UserGroupRepository;
```

> **NOTE**: Domain services and controllers depend on `IUserGroupRepository` (the interface in
> `application/interfaces/repositories/`), never on the concrete repository class.

---

## Sub-Documents

This section covers the aggregate case: a domain model that contains other domain models, persisted
as embedded sub-documents inside one root document.

### When to Create a Sub-Document Model

> **RULE**: Create a sub-document model when the domain model has **another domain model (extending
> `DomainEntity`) or any other class instance** as a property — instead of a primitive type or a
> `Record<string, primitive type>`.

> **IMPORTANT**: If the decision is unclear or complex (e.g. the property could reasonably stay a
> plain object, or the nesting is deep), **prompt the owner for a decision** instead of blindly
> making assumptions or creating models.

✅ Sub-document model needed — `NewOrder` holds child domain entities:

```typescript
// src/domain/order/models/order.ts
protected _items: Record<string, NewOrderItem>;   // child domain entities → sub-document
```

❌ No sub-document model — plain data stays a plain schema property:

```typescript
protected _labels: Record<string, string>;   // Record<string, primitive> → plain schema field
```

### The Sub-Document Interface and Schema

The sub-document's **persistence model interface** follows the same rules as the root
(`INew…Schema`-style single interface, snake_case names) with one difference: `_id` may or may not
be declared, depending on whether the embedded entity needs identity
(see `IOrderItemSchema._id?: Types.ObjectId` above). The schema file exports the
`Schema` only — no `model()` (see [Root Documents vs Sub-Documents](#root-documents-vs-sub-documents)).

### One Mapper per Sub-Document, Used Inside the Parent

> **RULE**: Create a **separate mapper for each sub-document model**, and use the sub-document mapper
> **inside the parent document mapper** — held as a `private readonly` field.

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order.mapper.ts
export class OrderMapper extends BaseMapper<INewOrderSchema, Order, NewOrder> {
  private readonly itemMapper = new OrderItemMapper();
  // ...
}
```

The sub-document mapper composes its own child mappers the same way:

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order-item.mapper.ts
export class OrderItemMapper extends BaseSubDocumentMapper<
  IOrderItemSchema,
  INewOrderItem,
  NewOrderItem
> {
  private readonly discountMapper = new DiscountEntryMapper();
  private readonly taxLineMapper = new TaxLineMapper();
  private readonly fulfillmentPolicyMapper = new FulfillmentPolicyMapper();
  // ...
}
```

### The Sub-Document Mapper Contract

> **RULE**: Sub-document mappers extend `BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel>`
> (in `.../mongoose/base/base-subdocument.mapper.ts`), where the generics mean:
>
> - **`DBSchema`** — the **persistence model interface** of the sub-document (e.g. `IOrderItemSchema`)
> - **`DomainModel`** — the **constructor interface** of the child domain model only (e.g.
>   `INewOrderItem`). The real child domain model is constructed **inside the parent domain
>   model**, not by the mapper.
> - **`NewDomainModel`** — the child domain model **class** (e.g. `NewOrderItem`), passed to
>   `toPersistence` to convert it to the sub-document shape

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/base/base-subdocument.mapper.ts
export abstract class BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel> implements IBaseSubDocumentMapper<
  DBSchema,
  DomainModel,
  NewDomainModel
> {
  abstract toDomain(data: DBSchema): DomainModel;
  abstract toPersistence(data: NewDomainModel): DBSchema;
}
```

> **IMPORTANT**: Unlike root `BaseMapper.toDomain`, the sub-document `toDomain(data: DBSchema)` has
> **no `& { _id: ... }` intersection**. A root document read from the database always has an `_id`;
> a sub-document **may or may not** have one, so `_id` presence cannot be part of the contract.
> Declare `_id` as optional on the sub-document's persistence model interface and handle its
> presence inside the mapper, e.g. `...(data._id && { id: data._id.toString() })`.

- `toDomain(data: DBSchema): DomainModel` — returns only an object with the constructor-interface
  shape; the real domain model is constructed inside the parent domain model
- `toPersistence(data: NewDomainModel): DBSchema` — the real child domain model is passed in and
  converted to the sub-document persistence shape

### Map ↔ Record Conversion

Embedded collections are stored as Mongoose `Map`s (`{ type: Map, of: SubSchema }`) but domain
models use `Record<string, …>`. The sub-document mapper converts between them with small private
helpers that delegate each entry to the child mapper:

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order-item.mapper.ts
private mapToDomainRecord<S extends { _id?: string }, D>(
  map: Map<string, S> | undefined,
  mapper: { toDomain(d: S & { _id: string }): D },
): Record<string, D> {
  return map
    ? Object.fromEntries(
        Array.from(map.entries()).map(([key, value]) => [key, mapper.toDomain(value as S & { _id: string })]),
      )
    : {};
}

private mapToPersistenceMap<S, D>(record: Record<string, D>, mapper: { toPersistence(d: D): S }): Map<string, S> {
  return new Map(Object.entries(record).map(([key, value]) => [key, mapper.toPersistence(value)]));
}
```

And `toDomain` returns the **constructor interface** shape, handling `_id` internally:

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order-item.mapper.ts
toDomain(data: IOrderItemSchema): INewOrderItem {
  const discounts = this.mapToDomainRecord(data.discounts, this.discountMapper);
  const taxLines = this.mapToDomainRecord(data.tax_lines, this.taxLineMapper);

  const itemData: INewOrderItem = {
    ...(data._id && { id: typeof data._id === 'string' ? data._id : data._id.toString() }),
    sku: data.sku,
    quantity: data.quantity, // persistence field -> domain field: no cast needed
    // ... remaining optional fields spread conditionally
    discounts,
    tax_lines: taxLines,
    ...(data.fulfillment_policy !== undefined && {
      fulfillment_policy: this.fulfillmentPolicyMapper.toDomain(data.fulfillment_policy),
    }),
  };
  return itemData;
}
```

### The Parent Constructs the Real Children

The sub-document mapper hands interface-shaped data up; the **parent domain model's constructor**
turns it into real child domain entities:

```typescript
// src/domain/order/models/order.ts
constructor(data: INewOrder) {
  super();
  if (data.id) this._id = data.id;
  this._name = data.name;
  // ...
  this._items = data.items
    ? Object.fromEntries(Object.entries(data.items).map(([k, v]) => [k, new NewOrderItem(v)]))
    : {};
  this._shipments = data.shipments ?? {};
}
```

The root mapper closes the loop — it feeds the interface-shaped sub-document data into the root
domain model constructor:

```typescript
// src/infrastructure/persistance/database/repositories/mongoose/order/order.mapper.ts
toDomain(data: INewOrderSchema & { _id: Types.ObjectId }): Order {
  const items: Record<string, INewOrderItem> = data.items
    ? Object.fromEntries(
        Array.from(data.items.entries()).map(([key, item]) => [key, this.itemMapper.toDomain(item)]),
      )
    : {};
  // ... assemble orderData with items, billing_details, shipments
  return new Order(orderData as IOrder);
}

toPersistence(data: NewOrder): INewOrderSchema {
  const items = new Map(
    Object.entries(data.items).map(([key, item]) => [key, this.itemMapper.toPersistence(item)]),
  );
  // ... assemble base object
  return !data.id ? base : { ...base, _id: data.id };
}
```

---

## End-to-End Checklist

```
☐ 1.  Domain model (INewX, IX, NewX extends DomainEntity, X extends NewX) — src/domain/{feature}/models/
☐ 2.  Domain invariants validated in constructors/setters → DomainEntityError
☐ 3.  Decide sub-documents: child domain model / class-instance property → sub-document model;
      primitive or Record<string, primitive> → plain schema field. Unclear? Ask the owner.
☐ 4.  Persistence model interface: INew{Model}Schema ONLY, optional _id, snake_case names
      (sub-documents: _id optional or absent as needed)
☐ 5.  Schema with the same property names as the interface; { timestamps: true } on the root
☐ 6.  model() on the ROOT document only — sub-document files export their Schema only
☐ 7.  Sub-document mappers extend BaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel>
      (DBSchema = persistence model interface, DomainModel = constructor interface, NewDomainModel = child class)
☐ 8.  Root mapper extends BaseMapper; holds sub-document mappers as private readonly fields;
      toDomain uses the & { _id } intersection and ._id.toString(); toPersistence omits _id when id is falsy
☐ 9.  Repository interface in application/interfaces/repositories/; class extends BaseRepository;
      no CRUD duplication; export default
☐ 10. JSDoc on every non-trivial method; npm run lint clean; npx tsc --noEmit passes
```

---

## Related Documents

- `./Database_Seeding_Guide.md` — initializing the database with default data
- `Docs/architecture/infrastructure-layer-pattern.md` — where these artifacts sit
  in the infrastructure layer, DI registration, drivers and factories
- Root `CLAUDE.md` and `AGENTS.md` — the condensed rule set these patterns belong to
