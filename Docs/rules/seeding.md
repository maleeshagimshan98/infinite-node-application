# Seeding rules (§16)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md); these rules are as binding as the ones there. A § this file
doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names. How the seeders run and what they seed:
`Docs/prompts/Database_Seeding_Guide.md`.

---

## 16. Seeding

Seeders live in `src/infrastructure/persistance/database/seeders/`: `seeder.ts` (the orchestrator and CLI entry) and
one `{name}.seeder.ts` per resource. They are command-line scripts, so they report progress with `console`;
`eslint.config.mjs` turns `no-console` off for that folder, and only for it (§12.3).

### 16.1 Seed through the services the API uses

**Rule:** A seeder resolves the service that owns the operation from the container
(`container.resolve<RoleService>('roleService')`; §2.1 allows `@/app/core/service.container` in the seeders) and
passes it `INew{Model}` payloads. Use a repository only when no service method does the job, and a Mongoose model only
when neither does.
**Why:** Seeded data then passes the same invariants, normalization and uniqueness checks as data created through the
API.
**Use cases:**

- users → `SignupApplicationService.register(userData, false)`: the trailing `false` sends no verification email,
  because the seeded addresses are placeholders
- a bulk delete no service offers → the model, as `clearUsers()` does with `UserModel.deleteMany({})`

**Reference:** `src/infrastructure/persistance/database/seeders/role.seeder.ts`

### 16.2 Make every seeder idempotent

**Rule:** `seed{Feature}()` checks for its data first (`userGroupService.getDefaultGroup()`,
`roleService.getDefaultRole()`, `resourceService.getByName('users')`) and returns `false` (skipped) when it exists.
Per item, it skips a `DomainServiceError` whose type is `'ALREADY_EXISTS'` and rethrows every other error; it never
matches the message text (§7.3).
**Why:** `npm run seed` must be safe to run again. A duplicate comes either from the service's own check (with a
specific message) or from a unique index when another writer won the race (with a generic message), so only the type
identifies it.
**Use cases:**

- the check → `if (error instanceof DomainServiceError && error.type === 'ALREADY_EXISTS')` skip the item, else
  `throw error`
- after you change a seeder → run `npm run seed` twice; the second run skips everything

### 16.3 Seed in dependency order, clear in reverse

**Rule:** `runAllSeeders()` in `seeder.ts` calls each `seed{Feature}()` after the seeders of the data it references,
and `clearAllSeeders()` calls the `clear{Feature}()` functions in reverse. Today that is resources → roles → user
groups → users, and users → user groups → roles → resources. A new seeder is wired into both by hand.
**Why:** A role references resources, and a user references a role and a user group (`role_id`, `ug_id`). Seeding a
referencing record first fails; clearing a referenced one first leaves dangling ids.
**Use cases:**

- the indexes → build them before seeding: `npm run db:indexes` before `npm run seed` (`db:indexes:prod` before
  `seed:prod`; Docker Compose runs `db-indexes` before `seed`). With `MONGODB_AUTO_INDEX=false` nothing else builds
  the unique indexes (§6.7)

### 16.4 New seeder checklist

```
☐ 1  {name}.seeder.ts in seeders/, exporting seed{Feature}(): Promise<boolean> and clear{Feature}(): Promise<void>
☐ 2  Resolve the service that owns the operation from the container (§16.1)
☐ 3  Check for existing data first; return false when it exists (§16.2)
☐ 4  Build INew{Model} payloads and create each through the service; skip ALREADY_EXISTS by type, rethrow the
     rest (§16.2)
☐ 5  Wire seed{Feature}() into runAllSeeders() and clear{Feature}() into clearAllSeeders(), in dependency order
     (§16.3)
☐ 6  npm run db:indexes, then npm run seed twice: the second run skips cleanly
☐ 7  JSDoc (§12.5) and the §13.2 checks
```
