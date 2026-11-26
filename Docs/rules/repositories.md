# Repository rules (§6.4–§6.8)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

Where the files live, and the schema and mapper rules (§6.1–§6.3, §6.9–§6.11), are in [`mappers.md`](mappers.md).

---

### 6.4 Extend `BaseRepository` and depend on its interface

**Rule:** A repository extends `BaseRepository<Schema, Model, NewModel>`, implements `I{Model}Repository` from
`src/application/interfaces/repositories/` (in a `{feature}/` folder when the feature has more than one repository,
§15.1), and adds only domain-specific queries. Domain services and controllers inject the interface, never the class.
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
  switching the flag must unset the old default first, in the same transaction (`RoleApplicationService.update()`,
  §8.1), and the current default is never unset on its own (`INVALID_OPERATION`)
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

### 6.8 Update and delete with the `version` property of the entity you read

**Rule:** `BaseRepository.update(id, item: DomainModel)` writes
`findOneAndUpdate({ _id, __v: item.version }, { $set, $inc: { __v: 1 } })`, and `delete(id, version)` writes
`findOneAndDelete({ _id, __v: version })`. Always pass an entity you read and changed, never a `New{Model}` built from
a payload: `$set` writes every field of `item`.
**Why:** The write succeeds only if nobody changed the document since it was read, so concurrent updates can't
silently overwrite each other, and a delete decided on a stale read (e.g. "this role is not the default") can't remove
a document that changed since.
**Use cases:**

- success → the entity, its `version` property incremented by 1; an unknown id → `null`
- a root model → `IBaseRepository<DomainModel extends IVersionedEntity, …>` accepts only a domain model with a
  `version` property (§5.4), so a repository for a model without one doesn't compile
- the stored `__v` no longer equals `item.version` (another write came first) → `RepositoryError` `VERSION_CONFLICT`
  → `DomainServiceError` `CONFLICT` (409, §10)
- inside a transaction → a concurrent commit raises a `WriteConflict` labelled `TransientTransactionError`, and
  `withTransaction` re-runs the callback, which reads the entity again with its new `version` property: the client's
  `version` then fails `assertVersion()` with `CONFLICT`, while an internal flow, which sends no client `version`,
  succeeds
- a delete → pass the `version` property of the entity the domain service just read (§7.6); a delete still can't see
  a change to *another* document between its checks and the write (e.g. a user assigned to the role being deleted)
