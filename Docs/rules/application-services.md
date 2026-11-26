# Application services and transactions (§8)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

---

## 8. Application services and transactions

File: `src/application/services/{feature}/{name}.application.service.ts`, `export default`.

### 8.1 Start every database transaction in an application service

**Rule:** When an operation must run in a database transaction (several writes that succeed or fail together, in one
domain service or several), an application service starts it with `dbTransaction()`. Domain services never open a
transaction; they take `transactionOptions` and pass it down (§7.5). An operation that needs no transaction stays in
the domain service. The application service extends `BaseApplicationService`, and its first constructor parameter is
`database_mapper: IDatabaseMapper`, passed to `super(database_mapper)`.
**Why:** One place owns the transaction boundary, so a multi-write operation can't run half-done because its caller
forgot the session. The parameter name is the DI token (§4.2).
**Use cases:**

- several domain services → `SignupApplicationService.register()` (default group and role, user, verification code)
- several writes of one service → `AccountRecoveryApplicationService.forgotPassword()`,
  `RoleApplicationService.update()` and `UserGroupApplicationService` (switching the default unsets the old one first)
- the controller calls the application service for that operation and the domain service for the rest
  (`RoleController`)
- a write that also changes the cache → change the cache only after the transaction commits:
  `AccountRecoveryApplicationService.resetPassword()` and `UserApplicationService.update()` (a new password, or a
  status other than `active`) revoke every session with `LoginService.revokeAllForUser()` inside the transaction, then
  evict them with `LoginApplicationService.evictLoginRecords()`

**Reference:** `src/application/services/auth/signup.application.service.ts`; one service:
`src/application/services/auth/role.application.service.ts`

### 8.2 Run the work in `dbTransaction()` and pass `{ session }` everywhere

**Rule:** Wrap transactional work in `this.dbTransaction(async ({ session }) => { ... })` and pass `{ session }` to
every domain-service call inside it.

```typescript
const user = await this.dbTransaction(async ({ session }) => {
  const role = await this.roleService.getDefaultRole({ session });
  if (!role) throw new DomainServiceError('No default role is available', 'UNKNOWN_ERROR');
  return await this.userService.create({ ...data, role_id: role.id }, { session });
});
```

### 8.3 Never catch or re-wrap database errors inside the callback

**Rule:** Let errors leave the callback unchanged.
**Why:** `withTransaction` retries the callback only while a raw `MongoError` labelled `TransientTransactionError`
escapes it, and `BaseRepository` already rethrows those unchanged (§6.5).
**Use cases:**

- a `DomainServiceError` thrown inside → propagates unchanged, with its type and HTTP status
- a driver failure that escapes the callback (commit failure, no replica set, lost connection) →
  `MongooseService.transaction()` turns it into `InfrastructureError` `CONNECTION_ERROR` when the database can't be
  reached, otherwise `PersistanceError`
