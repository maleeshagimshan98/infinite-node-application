# Database Seeding Guide

> **NOTE**: This guide documents the database seeding pattern used in this repository. The worked
> examples below are real code from this repository.

## Overview

Seeders initialize a service's database with default data so a fresh environment is usable
immediately — e.g. the **default user group** that new users are assigned to. They live in
`src/infrastructure/persistance/database/seeders/`:

```
seeders/
├── seeder.ts             # orchestrator + CLI entry (runAllSeeders / clearAllSeeders)
├── user-group.seeder.ts  # seedUserGroups / clearUserGroups
└── user.seeder.ts        # seedUsers / clearUsers
```

Seeders are **idempotent** — re-running them skips data that already exists.

## Prerequisites

- MongoDB reachable with the connection settings of your environment
- Environment variables: the seeder sets `NODE_ENV` to `development` when unset, then loads
  `.env.${NODE_ENV}` from the service root, followed by a plain `.env` fallback:

```typescript
// src/infrastructure/persistance/database/seeders/seeder.ts
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({
  path: path.resolve(__dirname, `../../../../../.env.${process.env.NODE_ENV}`),
});
dotenv.config(); // Load environment variables from .env file
```

## Running the Seeders

| Command              | Script                                                          | Effect                                                    |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `npm run seed`       | `tsx src/infrastructure/persistance/database/seeders/seeder.ts` | Seeds all default data (skips existing)                   |
| `npm run seed:clear` | same file with `--clear`                                        | Clears seeded data (users first, then non-default groups) |

The process exits with code `0` on success and `1` on failure. Existing data is reported as
`⏭️ Skipped (Already Exists)` — running `npm run seed` twice is safe.

## What Gets Seeded

### User Groups (`user-group.seeder.ts`)

Skipped entirely when a default group already exists (checked via
`userGroupService.getDefaultGroup()`). Otherwise seeds three groups through the container-resolved
`UserGroupService.create()`:

```typescript
// src/infrastructure/persistance/database/seeders/user-group.seeder.ts
const groupsToSeed: INewUserGroup[] = [
  {
    name: 'Default Group',
    description: 'Default user group for new users',
    discount: 0,
    default: true,
  },
  {
    name: 'Premium Members',
    description: 'Premium tier users with 10% discount',
    discount: 10,
    default: false,
  },
  {
    name: 'VIP Members',
    description: 'VIP tier users with 20% discount',
    discount: 20,
    default: false,
  },
];
```

### Users (`user.seeder.ts`)

Requires the default group to exist (this is why **order matters** — user groups are seeded before
users). Registers three sample users (`john/jane/bob@example.com`, status `pending_verification`)
through the container-resolved `SignupService.register()`, each with `ug_id` set to the default
group's id.

## How the Seeder Bootstraps

`seeder.ts` initializes the same DI container the application uses — seeders exercise the real
domain layer, not a parallel code path:

```typescript
// src/infrastructure/persistance/database/seeders/seeder.ts
// Register application components (services, repositories, controllers)
autoRegisterApplicationComponents();

// Initialize database mapper service (handles MongoDB connection internally)
const databaseMapperFactory = new DatabaseMapperServiceFactory();
const databaseMapper = await databaseMapperFactory.create();
container.register({
  databaseMapper: asValue(databaseMapper),
});
```

`runAllSeeders()` then runs each seeder **in dependency order** (user groups before users);
`clearAllSeeders()` clears in reverse (users before user groups).

## Seeder Conventions

> **RULE**: Seeders resolve **domain services** from the container and pass `INewX` domain-model
> payloads — never insert through raw Mongoose models. Resolution hierarchy when the needed
> operation exists: **Domain Service method → Repository → Mongoose Model** (raw model access is the
> last resort, e.g. `clearUsers()` uses `UserModel.deleteMany({})` only because no domain-level bulk
> delete exists).

> **RULE**: Every seeder is **idempotent** — check for existing data first (e.g.
> `getDefaultGroup()`), skip or per-item catch "already exists" errors, and report what was skipped.

> **RULE**: Seed in **dependency order** — referenced data (user groups) before referencing data
> (users with `ug_id`). Clear in reverse.

## Adding a New Seeder

```
☐ 1. Create {feature}.seeder.ts in src/infrastructure/persistance/database/seeders/
     exporting seed{Feature}(): Promise<boolean> and clear{Feature}(): Promise<void>
☐ 2. Resolve the domain service from the container (container.resolve<XService>('xService'))
☐ 3. Idempotency check first — return false (skipped) when the data already exists
☐ 4. Build payloads as INewX domain-model interfaces; create via the domain service
☐ 5. Wire seed{Feature}() into runAllSeeders() and clear{Feature}() into clearAllSeeders()
     in seeder.ts, respecting dependency order (seed: dependencies first; clear: reverse)
☐ 6. Run npm run seed twice — second run must skip cleanly
```

## Related Documents

- `./Domain_Model_Repository_Mapper_Guide.md` — creating the domain models, mappers, and
  repositories the seeders build on
