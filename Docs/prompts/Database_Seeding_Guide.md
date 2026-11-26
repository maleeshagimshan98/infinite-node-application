# Database seeding

How the seeders run and what they seed. This guide sets no rules. The rules for writing a seeder are §16
(`Docs/rules/seeding.md`), and its checklist is §16.4. For setting up a local environment, see
[`../Getting_Started.md`](../Getting_Started.md).

## Files

```
src/infrastructure/persistance/database/seeders/
├── seeder.ts             # orchestrator and CLI entry: runAllSeeders() / clearAllSeeders()
├── resource.seeder.ts    # seedResources() / clearResources()
├── role.seeder.ts        # seedRoles() / clearRoles()
├── user-group.seeder.ts  # seedUserGroups() / clearUserGroups()
└── user.seeder.ts        # seedUsers() / clearUsers()
```

## Before you seed

- MongoDB is reachable with your environment's connection settings.
- The indexes are built: `npm run db:indexes` (§16.3). `npm run db:indexes:check` lists existing duplicates first.
- Environment: the seeder sets `NODE_ENV` to `development` when it is unset. It then loads `.env.${NODE_ENV}` from
  the service root, then a plain `.env`.

## Commands

| Command                    | Effect                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run seed`             | Seeds all default data and skips what already exists                                         |
| `npm run seed:clear`       | Clears seeded data in reverse order: users, user groups, roles, then resources               |
| `npm run db:indexes`       | Lists duplicates and stops; otherwise normalizes emails, backfills `__v: 0`, builds indexes |
| `npm run db:indexes:check` | Lists duplicates and missing indexes; changes nothing                                        |

The seed commands exit with `0` on success and `1` on failure. Existing data is reported as skipped, so running
`npm run seed` twice is safe.

## What gets seeded

In dependency order (§16.3):

1. **Resources** (`resource.seeder.ts`):
   - Seeds `users`, `roles`, `resources`, `user-groups` and the email log resource (`EMAIL_LOG_RESOURCE_NAME`).
   - Skipped when the `users` resource exists. Resources have no `default` flag to check.
2. **Roles** (`role.seeder.ts`):
   - Seeds `Administrator`, with full CRUD on every seeded resource (`default: false`), and `Member` (`default: true`),
     the role new users get.
   - Skipped when a default role exists.
3. **User groups** (`user-group.seeder.ts`):
   - Seeds `Default Group` (`default: true`, no discount), `Premium Members` (10%) and `VIP Members` (20%).
   - Skipped when a default group exists.
4. **Users** (`user.seeder.ts`):
   - Seeds `john`, `jane` and `bob@example.com`, with status `pending_verification`, the default group and the default
     role.
   - Created through `SignupApplicationService.register(userData, false)`, with no verification email (§16.1).

`npm run seed:clear` deletes `Administrator`, because `clearRoles()` clears only non-default roles, and it deletes every
resource. `Member` survives.

## How the seeder starts

`seeder.ts` builds the same DI container the application uses, so seeders run through the real domain layer:

1. `InfrastructureManager.initForWorker(container)` registers every infrastructure service except `socket`. Plain
   `init()` would also build the socket service, which needs an HTTP server the seeder doesn't have.
2. `autoRegisterApplicationComponents()` registers the application components (services, repositories and
   controllers).
3. `runAllSeeders()` or `clearAllSeeders()` runs.
