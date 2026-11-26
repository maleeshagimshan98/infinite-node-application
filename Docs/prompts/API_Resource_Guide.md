# Building an API resource

A walkthrough of a new REST resource, layer by layer, using the real `resource` and `role` features as examples. This
guide sets no rules. Each step names the files to copy and the rules that apply: § numbers in `CLAUDE.md` and in the
rule files its "Rule files" table lists. Where this guide and the rules disagree, the rules win.

- The checklist to tick off: `CLAUDE.md` §13.1.
- The file set and paths: §15.1.
- How a request moves through the layers: `Docs/architecture/application-architecture.md`, sections 7 and 12.

## Before you start

- Pick the domain folder (`src/domain/{feature}/`) and the file stem (`{name}`). The schema, mapper and repository go
  in `mongoose/{feature}/`, and the repository interface's folder depends on how many repositories the feature has
  (§15.1). Some of the reference files below sit in older folders; copy their contents, not their paths.
- If the routes need permissions, choose the resource name the roles will grant (§9.6).
- Read each layer's rule file when you reach that step.

## Step 1: Domain model

- Copy: `src/domain/auth/models/resource.ts`, the four parts `INewResource`, `IResource`, `NewResource` and `Resource`.
  For nested data, see `src/domain/auth/models/role.ts`.
- Add each field as `protected _field` with a getter, and a setter only where the field may change.
- Rules:
  - the pattern: §5.1
  - the read-only `version` property: §5.4
  - emails: §5.5
  - which type goes where: §5.6
  - defaults and derived values: §5.8
  - class-typed properties: §5.9
  - a type guard only when a caller would otherwise need a cast: §5.3

## Step 2: Schema

- Copy: `src/infrastructure/persistance/database/repositories/mongoose/resources/resource.model.ts`.
- It holds the one interface (`INewResourceSchema` with `_id?` and `__v?`), the schema with `{ timestamps: true }`,
  one `schema.index()` per uniqueness rule, and the model.
- Rules: §6.1, §6.7, §6.9.
- After you add or change an index, run `npm run db:indexes:check`, then `npm run db:indexes`.

## Step 3: Mapper

- Copy: `…/mongoose/resources/resource.mapper.ts`.
- Rules: §6.2, §6.3.
- Embedded sub-documents: §6.10 and §6.11, and `Domain_Model_Repository_Mapper_Guide.md`.

## Step 4: Repository

- Copy the interface `src/application/interfaces/repositories/auth/resource.repository.interface.ts`. It is a type
  alias when there are no custom queries (§6.4).
- Copy the class `…/mongoose/resources/resource.repository.ts`.
- Rules: §6.4–§6.8.
- A custom query: §6.5, as in `…/mongoose/email/email.repository.ts`.
- Populated references: §6.6, as in `…/mongoose/roles/role.repository.ts`.

## Step 5: Domain service

- Copy: `src/domain/auth/service/resource.service.ts`. It has `create()`, `getById()`, `getAll(limit, offset)`,
  `update()` and `delete()`.
- Rules: §7.1–§7.6:
  - every public method runs inside `wrapInfrastructureErrors()`
  - `NOT_FOUND` after every lookup
  - `update()` and `delete()` check the client's `version` before any side effect
- `@throws` lists: §12.5.

## Step 6: Application service (only when an operation needs a transaction)

- Copy: `src/application/services/auth/role.application.service.ts`. Its `update()` switches the default role inside
  one transaction.
- Rules: §8.
- The first constructor parameter is `database_mapper` (§4.2).

## Step 7: Validators

- Copy: `src/presentation/http/validators/auth/resource.validator.ts`. It has a create validator, an update validator
  (optional body `version` field) and a delete validator (optional query `version`).
- Rules: §9.1.

## Step 8: Controller

- Copy: `src/presentation/http/controllers/auth/resource.controller.ts`.
- A paginated list: `RoleController.getAll()` in `role.controller.ts`. It calls `count({})` on the injected
  repository interface, then `getPaginator()`, then `apiOkResponse(200, true, paginator, …)`.
- Rules: §9.2–§9.4.
- The ETag, and the client's `version` on update and delete: §9.3.

## Step 9: Routes

- Copy: `src/presentation/http/routes/auth-resource.routes.ts`, and mount the router in `routes/index.ts`.
- Rules: §9.5. `UserValidatorMiddleware` comes first, and `RequestValidatorMiddleware` goes on create, update and
  delete. A new public route needs the user's approval.
- Role-limited routes: §9.6, as in `email-log.routes.ts`.
- A middleware of your own: §15.3.

## Step 10: Permissions and default data

- A protected resource needs its name exported as a constant from the domain model and added to `resource.seeder.ts`
  (§9.6).
- Default data needs a seeder: §16 and `Database_Seeding_Guide.md`.

## Step 11: Finish

Write the JSDoc (§12.5), run the §13.2 checks, and run `npm test`.

## Changing an existing resource

A change to the domain model is done only when the rest of the resource's files match it (§15.2).

## Using infrastructure services

Inject the interface, with the constructor parameter named after its token (§4.2). The tokens are in the
`Docs/rules/infrastructure.md` table (§11):
- external HTTP calls: §11.6
- queue workers: §11.5
- email: §11.7
- a cache that is only an optimisation: §11.8

A new infrastructure service: `CLAUDE.md` §13.4.
