# Database Seeding Guide

> **NOTE**: This guide documents the database seeding pattern used in this repository. The worked
> examples below are real code from this repository.

## Overview

Seeders initialize a service's database with default data so a fresh environment is usable
immediately — e.g. the **default user group** that new users are assigned to, and the RBAC
resources/roles that gate access. They live in
`src/infrastructure/persistance/database/seeders/`:

```
seeders/
├── seeder.ts             # orchestrator + CLI entry (runAllSeeders / clearAllSeeders)
├── resource.seeder.ts    # seedResources / clearResources
├── role.seeder.ts        # seedRoles / clearRoles
├── user-group.seeder.ts  # seedUserGroups / clearUserGroups
└── user.seeder.ts        # seedUsers / clearUsers
```

> For a full walkthrough of running the seeders (prerequisites, Docker Compose vs. local setup,
> JWT key generation, production notes), see [`../Getting_Started.md`](../Getting_Started.md).
> This document covers the **seeder implementation pattern** itself.

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

| Command              | Script                                                          | Effect                                                                          |
| -------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run seed`       | `tsx src/infrastructure/persistance/database/seeders/seeder.ts` | Seeds all default data (skips existing)                                        |
| `npm run seed:clear` | same file with `--clear`                                        | Clears seeded data in reverse order: users, user groups, roles, then resources |

The process exits with code `0` on success and `1` on failure. Existing data is reported as
`⏭️ Skipped (Already Exists)` — running `npm run seed` twice is safe.

## What Gets Seeded

Seeded in dependency order — each step below depends on the one before it.

### Resources (`resource.seeder.ts`)

`Resource` has no `default` flag to key idempotency off, so a canonical seeded resource name
(`'users'`) is checked instead via `resourceService.getByName()`. Seeds four resources through the
container-resolved `ResourceService.create()`:

```typescript
// src/infrastructure/persistance/database/seeders/resource.seeder.ts
const resourcesToSeed: INewResource[] = [
  { name: 'users', description: 'User accounts' },
  { name: 'roles', description: 'RBAC roles' },
  { name: 'resources', description: 'RBAC resources' },
  { name: 'user-groups', description: 'Customer groups' },
];
```

### Roles (`role.seeder.ts`)

Skipped entirely when a default role already exists (checked via `roleService.getDefaultRole()`).
Requires resources to exist first — it fetches all resources and grants the `Administrator` role
full CRUD on every one of them:

```typescript
// src/infrastructure/persistance/database/seeders/role.seeder.ts
const rolesToSeed: INewRole[] = [
  {
    name: 'Administrator',
    description: 'Full access to every resource',
    default: false,
    resource_permissions: resources.map((resource) => ({
      resource_id: resource.id,
      permission: { read: true, write: true, update: true, delete: true },
    })),
  },
  {
    name: 'Member',
    description: 'Default role assigned to newly registered users',
    default: true,
    resource_permissions: [],
  },
];
```

> **Caveat**: `Administrator` is seeded with `default: false`, so `clearRoles()` (which only
> clears non-default roles) deletes it on `npm run seed:clear`. `Member` (`default: true`)
> survives. Resources have no `default` flag at all, so `clearResources()` deletes all of them
> unconditionally.

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

Requires both the default user group and the default role to exist (this is why **order
matters** — resources, then roles, then user groups, are all seeded before users). Registers
three sample users (`john/jane/bob@example.com`, status `pending_verification`) through the
container-resolved `SignupApplicationService.register()`, each with `ug_id` set to the default
group's id and `role_id` set to the default role's id.

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
// Registered under the mapper's own `serviceName()` ('database_mapper') so it resolves
// identically to how InfrastructureManager registers it in the running app.
container.register({
  [databaseMapper.serviceName()]: asValue(databaseMapper),
});
```

`runAllSeeders()` then runs each seeder **in dependency order** (resources → roles → user groups
→ users); `clearAllSeeders()` clears in reverse (users → user groups → roles → resources).

## Seeder Conventions

> **RULE**: Seeders resolve **domain services** from the container and pass `INewX` domain-model
> payloads — never insert through raw Mongoose models. Resolution hierarchy when the needed
> operation exists: **Domain Service method → Repository → Mongoose Model** (raw model access is the
> last resort, e.g. `clearUsers()` uses `UserModel.deleteMany({})` only because no domain-level bulk
> delete exists).

> **RULE**: Every seeder is **idempotent** — check for existing data first (e.g.
> `getDefaultGroup()`), skip or per-item catch "already exists" errors, and report what was skipped.

> **RULE**: Seed in **dependency order** — referenced data before referencing data (resources
> before roles that reference them; user groups and roles before users that reference both via
> `ug_id`/`role_id`). Clear in reverse.

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
