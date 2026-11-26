# Domain models, schemas, mappers and repositories

How the persistence side of a resource fits together. It walks through the real `UserGroup` files, then shows the
sub-document pattern, which nothing in the repository uses yet. This guide sets no rules. The rules are:
- §5 (`Docs/rules/domain-modelling.md`)
- §6.1–§6.3 and §6.9–§6.11 (`Docs/rules/mappers.md`)
- §6.4–§6.8 (`Docs/rules/repositories.md`)
- the type-assertion cases in §12.6

Where this guide and the rules disagree, the rules win. The rest of a resource (service, validators, controller,
routes) is in `API_Resource_Guide.md`.

## The pieces

```
        DOMAIN LAYER                    INFRASTRUCTURE LAYER
┌─────────────────────────┐   ┌──────────────────────────────────────────┐
│  Domain model            │   │  Mapper          Schema / Mongoose model │
│  (NewX / X classes,      │◄──┤  toDomain()  ◄── Mongoose document       │
│   behavior, invariants)  │   │  toPersistence() ──► Mongoose document   │──► MongoDB
│                          ├──►│        ▲                                 │
└─────────────────────────┘   │        │ used by                          │
                              │  Repository (extends BaseRepository)      │
                              └──────────────────────────────────────────┘
```

| Piece                | `UserGroup` file                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Domain model         | `src/domain/user/models/user-group.ts`                                                          |
| Schema and model     | `src/infrastructure/persistance/database/repositories/mongoose/user-groups/user-group.model.ts` |
| Mapper               | `…/mongoose/user-groups/user-group.mapper.ts`                                                   |
| Repository interface | `src/application/interfaces/repositories/user-groups/user-group.repository.interface.ts`        |
| Repository           | `…/mongoose/user-groups/user-group.repository.ts`                                               |
| Base classes         | `…/mongoose/base/base.mapper.ts`, `base-repository.ts`, `base-subdocument.mapper.ts`            |

The `user-groups/` folders predate the folder rules in §15.1. A new resource's files go where §15.1 says: the
`mongoose/` folder of its feature, and a repository interface folder that depends on how many repositories the
feature has.

## Walkthrough: `UserGroup`, a flat root document

1. **Domain model.**
   - `INewUserGroup`, `IUserGroup`, `NewUserGroup` and `UserGroup` follow the four-part pattern (§5.1).
   - The `version` property is optional on `INewUserGroup` / `NewUserGroup` and required on `IUserGroup` /
     `UserGroup`, with a getter and no setter (§5.4).
   - Request data becomes a `NewUserGroup`; data read from the database becomes a `UserGroup` (§5.6).
2. **Schema.**
   - `INewUserGroupSchema` is the only interface, with `_id?: Types.ObjectId` and `__v?: number` (§6.1). Its field
     names are snake_case, the same as the schema's (§6.9).
   - Two unique indexes back the service's uniqueness rules: `name`, and a partial index on `default` that allows only
     one default group (§6.7).
3. **Mapper.**
   - `toDomain()` takes `INewUserGroupSchema & { _id: Types.ObjectId }`. It returns `id: data._id.toString()` and
     `version: this.toVersion(data.__v, data._id)`.
   - `toPersistence()` omits `_id` for a new group, converts it with `new Types.ObjectId(data.id)` otherwise, and never
     writes `__v` (§6.2, §6.3).
4. **Repository.**
   - `UserGroupRepository` extends `BaseRepository` and adds nothing; `IUserGroupRepository` is the type the services
     inject (§6.4).
   - `update()` and `delete()` write only while the stored `__v` still equals the `version` property of the group you
     read (§6.8).
   - The inherited methods classify database errors (§6.5).

## Sub-documents (illustrative)

Use a sub-document when a property is another domain model or class instance (§5.9). The `Order` → `OrderItem`
example below is not in the repository; it shows the shape the rules in §5.10, §6.10 and §6.11 describe. The code is
trimmed to one field per class, and it type-checks against the real `BaseMapper`, `BaseSubDocumentMapper` and
`DomainEntity` under the project's `tsconfig.json`.

Schemas (§6.10). Both interfaces are named `INew…Schema` (§12.4); only the root has `__v`, and only the root file
calls `model()`:

```typescript
// mongoose/order/order-item.model.ts (sub-document): the interface and the Schema, no model()
export interface INewOrderItemSchema {
  _id?: Types.ObjectId;
  sku: string;
}
export const OrderItemSchema = new Schema<INewOrderItemSchema>({ sku: { type: String, required: true } });

// mongoose/order/order.model.ts (root)
export interface INewOrderSchema {
  _id?: Types.ObjectId;
  __v?: number;
  customer_email: string;
  items?: Map<string, INewOrderItemSchema>;
}
export const OrderSchema = new Schema<INewOrderSchema>(
  { customer_email: { type: String, required: true }, items: { type: Map, of: OrderItemSchema } },
  { timestamps: true },
);
export const OrderModel = model<INewOrderSchema>('Order', OrderSchema);
```

Mappers (§6.11). The child mapper returns constructor-interface data and maps `_id` only when it is present. The root
mapper holds the child mapper, and maps its own `id` and `version` property as any root mapper does (§6.2):

```typescript
export class OrderItemMapper extends BaseSubDocumentMapper<INewOrderItemSchema, INewOrderItem, NewOrderItem> {
  toDomain(data: INewOrderItemSchema): INewOrderItem {
    return { ...(data._id && { id: data._id.toString() }), sku: data.sku };
  }
  toPersistence(data: NewOrderItem): INewOrderItemSchema {
    return { ...(data.id && { _id: new Types.ObjectId(data.id) }), sku: data.sku };
  }
}

export class OrderMapper extends BaseMapper<INewOrderSchema, Order, NewOrder> {
  private readonly itemMapper = new OrderItemMapper();

  toDomain(data: INewOrderSchema & { _id: Types.ObjectId }): Order {
    const items: Record<string, INewOrderItem> = data.items
      ? Object.fromEntries(Array.from(data.items.entries()).map(([key, item]) => [key, this.itemMapper.toDomain(item)]))
      : {};
    return new Order({
      id: data._id.toString(),
      version: this.toVersion(data.__v, data._id),
      customer_email: data.customer_email,
      items,
    });
  }

  toPersistence(data: NewOrder): INewOrderSchema {
    const items = new Map(Object.entries(data.items).map(([key, item]) => [key, this.itemMapper.toPersistence(item)]));
    const base = { customer_email: data.customer_email, items };
    return !data.id ? base : { ...base, _id: new Types.ObjectId(data.id) };
  }
}
```

The parent model builds the child instances in its constructor (§5.10). `INewOrder.items` is
`Record<string, INewOrderItem>`, and `NewOrder` stores `Record<string, NewOrderItem>`:

```typescript
this._items = data.items
  ? Object.fromEntries(Object.entries(data.items).map(([key, item]) => [key, new NewOrderItem(item)]))
  : {};
```

## Checklist

```
☐ 1  Domain model: four parts, read-only version property, invariants → DomainEntityError (§5.1, §5.2, §5.4)
☐ 2  Sub-documents decided: class-typed property → sub-document, plain data → plain field; unclear → ask (§5.9)
☐ 3  Schema: INew{Model}Schema only, _id? and __v? on the root, snake_case, a unique index per uniqueness rule
     (§6.1, §6.7, §6.9); model() on the root only (§6.10)
☐ 4  Mappers: root extends BaseMapper, sub-documents extend BaseSubDocumentMapper, held as private readonly fields
     (§6.2, §6.3, §6.11)
☐ 5  Repository interface and class; custom queries inside wrapDatabaseErrors() (§6.4, §6.5)
☐ 6  JSDoc: a mapper lists @throws {PersistanceError} for a missing __v and {BSONError} for a malformed id (§12.5)
☐ 7  A new index: npm run db:indexes:check, then npm run db:indexes (§6.7)
☐ 8  A changed model: carried through every file of the resource (§15.2)
```
