# Getting Started: Initializing the Application

> Steps to take a fresh clone of this repo to a running instance — for local development or for a
> production deployment — including seeding the default data the application needs before its
> first API calls will succeed (default RBAC resources/roles, the default user group, sample
> users).

## 1. Prerequisites

| Requirement | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js     | 18+ LTS for local dev (the Docker image uses Node 22)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| MongoDB     | 7+, configured as a **replica set** (a single-node set named `rs0` is enough). This is not optional — the application/domain services run multi-document transactions (`IDatabaseMapper.transaction()`, via `BaseApplicationService.dbTransaction()`), which MongoDB only supports inside a replica set. Standalone MongoDB will fail at the first transactional write (signup, seeding, etc.). For a native (non-Docker) install on Windows or Linux, see [`guides/REPLICA_SET_SETUP_GUIDE.md`](guides/REPLICA_SET_SETUP_GUIDE.md). |
| Redis       | 7+. `REDIS_SERVICE_OPTIONAL=true` lets the app boot without it, but the rate limiter is designed to use it — treat it as required outside quick local experiments.                                                                                                                                                                                                                                                                                                                                                                   |
| npm         | Ships with Node.js                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## 2. Option A — Full stack via Docker Compose (fastest path)

`docker-compose.yml` already wires the dependency chain end-to-end: `mongodb` → `mongodb-init`
(initializes the `rs0` replica set) → `seed` (runs the seeders once) → `app` (starts only after
`redis` is healthy **and** `seed` has completed successfully). This is the only path where
seeding happens for you automatically.

1. Copy the example env file to `.env.production` — that's the file `docker-compose.yml`'s `app`
   and `seed` services actually load via `env_file:` (the setup comment at the top of
   `docker-compose.yml` says `.env`, but the services are configured to read `.env.production` —
   use that filename):

   ```powershell
   cp .env.example .env.production
   ```

2. Fill in the secrets Compose does **not** hardcode: `COOKIE_SECRET`, `SESSION_SECRET`,
   `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` (see [§4](#4-generating-jwt-rs256-keys) below). Leave
   `MONGODB_URI` / `REDIS_*` alone — Compose overrides those to the in-network service hostnames
   regardless of what's in the file.

3. Build and start everything:

   ```powershell
   docker compose up -d --build
   ```

4. Watch the one-shot seed job to confirm it finished:

   ```powershell
   docker compose logs -f seed
   ```

   Look for `✨ DATABASE SEEDING COMPLETED SUCCESSFULLY ✨`. The seed container is safe to
   re-run (`docker compose up -d --build seed` or a full `docker compose up -d --build`) — every
   seeder skips data that already exists.

5. Verify the app is up:

   ```powershell
   curl http://localhost:3000/api/v1/health/live
   ```

## 3. Option B — Local app, Dockerized infra (recommended for day-to-day development)

Running Mongo/Redis in Docker but the app itself with `tsx watch` gives fast reload without
hand-rolling a replica set locally.

1. Start only the infra services (this also runs `mongodb-init`, so the replica set is ready by
   the time it finishes):

   ```powershell
   docker compose up -d mongodb mongodb-init redis
   ```

2. Install dependencies and create `.env.development`:

   ```powershell
   npm ci
   cp .env.example .env.development
   ```

   Point it at the Dockerized infra and fill in the secrets from [§4](#4-generating-jwt-rs256-keys):

   ```dotenv
   MONGODB_URI=mongodb://localhost:27017/infinite-node-application?replicaSet=rs0
   REDIS_SERVER_URL=redis://localhost:6379
   REDIS_SERVER_HOST=localhost
   REDIS_SOCKET_HOST=localhost
   ```

3. Seed the database:

   ```powershell
   npm run seed
   ```

4. Start the dev server:

   ```powershell
   npm run dev
   ```

   Then verify with `curl http://localhost:3000/api/v1/health/live`.

No Docker at all is also possible (install MongoDB and Redis natively, initiate the replica set
yourself with `mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"`)
— everything past that point is identical to steps 2–4 above. For the complete walkthrough (a
two-member replica set running as native OS services, service management, troubleshooting — both
Windows and Linux), see [`guides/REPLICA_SET_SETUP_GUIDE.md`](guides/REPLICA_SET_SETUP_GUIDE.md).

## 4. Generating JWT RS256 keys

Auth uses RS256, so both a private and public PEM key are required (`JWT_PRIVATE_KEY` /
`JWT_PUBLIC_KEY`). The env value must be the PEM content on a single line with literal `\n`
between lines.

> **Note:** The straightforward "generate, then paste into `.env`" flow below is for **local
> development only**. Never store a production key as a plaintext value in a `.env` file on a
> server or in CI — see [Production](#production) below for how to handle it there instead.

### Local development

```powershell
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

# Convert each PEM file to the single-line \n-escaped form the .env value needs
node -e "console.log(require('fs').readFileSync('jwt_private.pem','utf8').split('\n').join('\\n'))"
node -e "console.log(require('fs').readFileSync('jwt_public.pem','utf8').split('\n').join('\\n'))"
```

Paste each command's output as the value of `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` respectively in
`.env.development`. Discard the `.pem` files afterwards — only the `.env` value is used at
runtime.

### Production

Generate the key pair the same way (`openssl genrsa` / `openssl rsa -pubout`), but don't hand-type
the PEM values into a plaintext `.env.production` that lives on a server or in CI — that file
persists on disk (and often in build logs) indefinitely, unlike a secret pulled fresh at deploy
time.

1. **Store the pair in a managed secret store.** Worked example with AWS Secrets Manager:

   ```powershell
   aws secretsmanager create-secret --name infinite-node/jwt-private-key --secret-string file://jwt_private.pem
   aws secretsmanager create-secret --name infinite-node/jwt-public-key  --secret-string file://jwt_public.pem
   ```

   Any other cloud provider's equivalent works the same way — GCP Secret Manager, Azure Key
   Vault, HashiCorp Vault, etc. Delete the local `.pem` files once they're stored.

2. **Inject the values as environment variables at deploy time**, not by committing them to a
   file ahead of time:

   - **Docker Compose** (this repo's `docker-compose.yml`, e.g. a single-VM deployment) — have
     your deploy step pull the secret and write `.env.production` immediately before
     `docker compose up -d --build`, instead of that file being hand-populated once and left
     sitting on the host:

     ```powershell
     aws secretsmanager get-secret-value --secret-id infinite-node/jwt-private-key `
       --query SecretString --output text
     ```

     Write the result as `JWT_PRIVATE_KEY=<value>` (same single-line `\n`-escaped form as above)
     into `.env.production` as part of the deploy script/pipeline. Regenerate the file on every
     deploy; never commit it or leave it pre-populated between deploys.

   - **AWS ECS Fargate** (or another container orchestrator) — reference the secret's ARN
     directly in the task definition's `secrets` block; the platform injects it as a container
     environment variable at task start, so the value never touches disk, a CI log, or a deploy
     script at all. This repo doesn't yet ship the Terraform/ECS task-definition config for that —
     treat this as the target pattern once that infra exists, not something already wired up here.

Either way, the app only ever reads `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` from `process.env` — how
those variables get populated is entirely a deployment concern, not a difference in app behavior.

## 5. What gets seeded, and why the order matters

`npm run seed` (dev) / `npm run seed:prod` (compiled `dist/`, used by the Docker `seed` service)
runs `src/infrastructure/persistance/database/seeders/seeder.ts`, which seeds in this order —
each step depends on the one before it:

| Order | Seeder                 | Creates                                                                                                         |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1     | `resource.seeder.ts`   | RBAC resources: `users`, `roles`, `resources`, `user-groups`                                                    |
| 2     | `role.seeder.ts`       | Roles: `Administrator` (full CRUD on every seeded resource) and `Member` (the **default** role new signups get) |
| 3     | `user-group.seeder.ts` | Customer groups: `Default Group` (**default**, assigned to new signups), `Premium Members`, `VIP Members`       |
| 4     | `user.seeder.ts`       | 3 sample users (`john/jane/bob@example.com`), each assigned the default group and default role                  |

Every seeder is idempotent — re-running `npm run seed` reports `⏭️ Skipped (Already Exists)` for
anything already present, so it's safe to run again after every deploy. Full internals (how a
seeder is structured, the domain-service resolution rule, how to add a new one) are documented in
[`prompts/Database_Seeding_Guide.md`](prompts/Database_Seeding_Guide.md).

### Clearing seeded data

`npm run seed:clear` (dev) / `npm run seed:prod:clear` (prod) clears in reverse order — Users,
User Groups, Roles, Resources. Two things worth knowing before running it:

- Only **non-default** roles/groups are cleared. `Member` and `Default Group` survive; the
  `Administrator` role does **not** (it's seeded with `default: false`) and will be deleted.
- Resources have no `default` flag, so `seed:clear` removes **all** of them, every time.

Re-running `npm run seed` afterwards re-creates whatever was cleared.

## 6. Production notes

- `npm run seed:prod` / `seed:prod:clear` run the **compiled** seeder (`dist/...`), so `npm run
build` must have already produced `dist/` if you're not using the Docker image's `build` stage.
- The Docker Compose `seed` service already runs `seed:prod` automatically before `app` starts —
  no manual step needed when deploying via Compose.
- Re-seeding a running production database is safe (idempotent) but re-running `seed:prod:clear`
  is destructive per the caveats above — don't run it against production without checking what it
  will remove.

## 7. Troubleshooting

| Symptom                                                                   | Cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seeding (or any write) fails with a transaction/session error immediately | `MONGODB_URI` is missing `?replicaSet=rs0`, or the replica set was never initiated — connect with `mongosh` and run `rs.status()` to confirm. See [`guides/REPLICA_SET_SETUP_GUIDE.md`](guides/REPLICA_SET_SETUP_GUIDE.md#troubleshooting-windows) ([Linux](guides/REPLICA_SET_SETUP_GUIDE.md#troubleshooting-linux)) for a from-scratch native setup. Over HTTP (e.g. signup) this is only a generic 500 — the server log shows `PersistanceError` `Failed to execute transaction: Transaction numbers are only allowed on a replica set member or mongos` |
| An endpoint returns a generic 500 / 503 with no details                   | Infrastructure error details are never sent to the client — the full error (with its original `cause`) is in the server log. 503 means a network/connection failure                                                                                                                                                                                                                                                                                                                                                                                         |
| Role seeder logs `⚠️ No resources found. Please seed resources first.`    | Resource seeding failed or was skipped unexpectedly — check the `🔹 Seeding Resources...` log lines above it                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Every seeder logs `⏭️ Skipped (Already Exists)`                           | Expected on a re-run — not a failure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 429 Too Many Requests on every route                                      | Redis is unreachable; the rate limiter uses a Redis-backed store via the DI `cache` service                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Related documents

- [`prompts/Database_Seeding_Guide.md`](prompts/Database_Seeding_Guide.md) — seeder implementation
  pattern and how to add a new one
- [`rbac_plan.md`](rbac_plan.md) — the RBAC model the resource/role seeders populate
- [`guides/REPLICA_SET_SETUP_GUIDE.md`](guides/REPLICA_SET_SETUP_GUIDE.md) — full walkthrough for
  setting up a native (non-Docker) MongoDB replica set on Windows or Linux
