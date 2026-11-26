# API resource rules (§15)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md); these rules are as binding as the ones there. A § this file
doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names. The checklist for a new resource is
`CLAUDE.md` §13.1; the walkthrough is `Docs/prompts/API_Resource_Guide.md`.

---

## 15. API resources

### 15.1 Put each file of a resource at its path

**Rule:** A resource is these files, at these paths. The placeholders:

- `{feature}`: the domain folder (`auth`, `user`, `app/email`). Outside `src/domain/`, folders use its last segment
  (`mongoose/email/` and `controllers/email/` for `app/email`).
- `{name}`: the file stem (`role`, `user-group`).

| File                                             | Path                                                                                      | Rules      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------- |
| Domain model                                     | `src/domain/{feature}/models/{name}.ts`                                                   | §5         |
| Type guards (only when narrowing is needed)      | `src/domain/{feature}/models/guards/{name}.guards.ts`                                     | §5.3       |
| Schema                                           | `src/infrastructure/persistance/database/repositories/mongoose/{feature}/{name}.model.ts` | §6.1, §6.9 |
| Mapper                                           | `…/mongoose/{feature}/{name}.mapper.ts`                                                   | §6.2, §6.3 |
| Repository interface, the feature's only one     | `src/application/interfaces/repositories/{name}.repository.interface.ts`                  | §6.4       |
| Repository interface, one of several             | `src/application/interfaces/repositories/{feature}/{name}.repository.interface.ts`        | §6.4       |
| Repository                                       | `…/mongoose/{feature}/{name}.repository.ts`                                               | §6.4–§6.8  |
| Domain service                                   | `src/domain/{feature}/service/{name}.service.ts`                                         | §7         |
| Application service (only for a transaction)     | `src/application/services/{feature}/{name}.application.service.ts`                       | §8         |
| Validators                                       | `src/presentation/http/validators/{feature}/{name}.validator.ts`                         | §9.1       |
| Controller                                       | `src/presentation/http/controllers/{feature}/{name}.controller.ts`                       | §9.2–§9.4  |
| Routes                                           | `src/presentation/http/routes/{name}.routes.ts`, mounted in `routes/index.ts`            | §9.5, §9.6 |
| Seeder (only when the resource has default data) | `src/infrastructure/persistance/database/seeders/{name}.seeder.ts`                       | §16        |

**Why:** DI registers a class only when its file matches an auto-registration glob (§4.1), and every agent then finds
a resource's files in the same places.
**Use cases:**

- a feature gets its second repository → move the first one's interface into `repositories/{feature}/` as well, so
  all of the feature's repository interfaces sit together
- folders that predate this rule → `mongoose/resources/`, `mongoose/roles/` and `mongoose/user-groups/` are named for
  their resource, `repositories/email/` and `repositories/notification/` each hold a feature's only interface, and
  `repositories/user-groups/` holds the `user` feature's second interface. They stay until they are moved on
  purpose; don't copy their folder names for a new resource
- a route file for one of several resources of a feature takes the feature as a prefix: `auth-role.routes.ts` serves
  `/auth/roles`

### 15.2 Carry a domain model change through every file of the resource

**Rule:** A change to a domain model (a field added, removed, renamed or retyped, or a changed invariant) is done only
when every file of the resource that touches that field matches it: the schema (a field that becomes unique gets a
unique index, §6.7), the mapper, the repository's custom queries and filters, the validators, any response the
controller builds by hand (§9.3) and the seeder's data. Search the resource's files for the field name before you call
the change done.
**Why:** The domain model is the source of truth for the resource's shape. A change to the model alone can compile and
still lose the field (a mapper that drops it) or reject it (a validator that doesn't know it).

### 15.3 Write a middleware as a factory that answers through `ApiResponseUtils`

**Rule:** A middleware lives in `src/presentation/http/middleware/{Name}Middleware.ts` as a named export: a factory
that takes its settings, or a provider function for a container-resolved service, and returns
`(req, res, next) => …`. It refuses a request with `ApiResponseUtils.createResponse(ApiResponseUtils.…(), res)` and
returns; otherwise it calls `next()`.
**Why:** `createResponse()` sends every answer the same way, headers included (§9.3), and a factory is configured per
route (`PermissionMiddleware(EMAIL_LOG_RESOURCE_NAME, 'read')`) and testable without the container.
**Use cases:**

- a service the middleware needs → a provider parameter, as in
  `UserValidatorMiddleware(loginApplicationServiceProvider)`
- a route-level check → after `UserValidatorMiddleware`, like `PermissionMiddleware` (§9.6)

**Reference:** `src/presentation/http/middleware/PermissionMiddleware.ts`
