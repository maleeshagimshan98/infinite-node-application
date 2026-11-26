# Domain service rules (§7)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

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
`'ALREADY_EXISTS'`, and the rule needs a unique index (§6.7); a client `version` that no longer matches the
entity's `version` property is `'CONFLICT'` (§7.6); any other rule violation is `'VALIDATION_ERROR'` (or
`'INVALID_OPERATION'` for a forbidden state change).
**Why:** Controllers map the type to the HTTP status (§10), and callers such as the seeders branch on the type,
never on the message.

### 7.4 Return the deleted entity from `delete()`

**Rule:** `delete()` returns the deleted domain object, never `void`, after the two `NOT_FOUND` checks of §7.2. It
passes the `version` property of the entity it read to the repository's `delete()` (§7.6).
**Why:** Callers and the API response show what was removed.

### 7.5 Accept `TransactionOptions` and pass it down

**Rule:** Every read or write method that can run in a transaction takes `transactionOptions?: TransactionOptions` as
its last parameter and passes it to every repository and domain-service call it makes.
**Why:** One missed call runs outside the session and breaks the transaction's atomicity.

### 7.6 Check the client's `version` before any side effect in `update()` and `delete()`

**Rule:** `update(id, data)` takes the client's `version` out of the payload, reads the entity, calls
`this.assertVersion(entity, version, '{Model}')` (the client's `version` against the entity's `version` property)
before any other check or write, then applies the changes and calls the repository's `update()` (§6.8).
`delete(id, version?, transactionOptions?)` reads the entity, calls `assertVersion()` first, runs its checks, then
calls `repository.delete(id, entity.version, transactionOptions)`.
**Why:** A client `version` that no longer matches fails fast with `CONFLICT` before anything changes; the
conditional write then makes the check atomic.
**Use cases:**

- the client's `version` is `undefined` → the check is skipped, for internal callers that write an entity they just
  read
- a client update or delete → the controller requires the client's `version`, from the `If-Match` header or the
  body / query `version` field (§9.3), so the check always runs

```typescript
async update(id: string, data: Partial<INewResource>, transactionOptions?: TransactionOptions): Promise<Resource> {
  return this.wrapInfrastructureErrors(async () => {
    const { version, ...changes } = data; // the version property has no setter: Object.assign() would throw
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
