# Presentation rules: validators, controllers, routes (§9)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

---

## 9. Presentation (validators, controllers, routes)

### 9.1 Validate requests only in validators

**Rule:** Request validation lives in `src/presentation/http/validators/{feature}/{name}.validator.ts` as functions
returning an express-validator `Schema`, with separate create and update validators. Never validate in controllers
or domain services.

```typescript
export const newResourceValidator = (): Schema => ({
  name: { notEmpty: true, isString: true, errorMessage: 'Resource name is required' },
  description: { optional: true, isString: true },
});
```

**Use cases:**

- an update validator for a root entity → a body `version` field, the value of the `version` property the client
  read (§7.6), optional because the `If-Match` header can carry it instead:
  `version: { in: ['body'], optional: true, isInt: { options: { min: 0 } }, toInt: true, … }`
- a delete validator → the same `version` rule with `in: ['query']` (`DELETE …/:id?version=N`)

**Reference:** `src/presentation/http/validators/auth/role.validator.ts`

### 9.2 Run all controller logic inside `catchExceptionsWrapper()`

**Rule:** A controller extends `BaseController`, takes `logger: ILogger` last and passes it to `super(logger)`. Every
method builds its response inside `this.catchExceptionsWrapper()` and sends it with
`ApiResponseUtils.createResponse(response, res)`.
**Why:** The wrapper maps every error to its status (§10) and logs it with the request's `trace_id`: a 5xx as an
error with its stack, anything else as a warning.

```typescript
export class RoleController extends BaseController {
  constructor(
    private roleService: RoleService,
    private roleRepository: IRoleRepository, // for count()
    logger: ILogger,
  ) {
    super(logger);
  }

  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewRole>(req);
      const result = await this.roleService.create(data);
      return ApiResponseUtils.apiOkResponse(201, false, null, 'Role created successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}
export default RoleController;
```

**Reference:** `src/presentation/http/controllers/auth/role.controller.ts`

### 9.3 Read input with `matchedData()` and answer with `ApiResponseUtils`

**Rule:** Read the body and query only through `matchedData<T>(req)`, never `req.body`. Build every response with
`ApiResponseUtils`, never by hand.
**Use cases:**

- a route parameter → `this.getStringParam(req, 'id')` (a missing one is a 400)
- a paginated list → `count({})` on the injected repository, `this.getPaginator(req, totalCount)`, then the service
  with `paginator.getResultsPerPage()` / `getOffset()`, and `apiOkResponse(200, true, paginator, …)`
- response headers (`Retry-After`, `WWW-Authenticate`, `ETag`) → the last argument of
  `apiErrorResponse(code, message, data?, headers?)` or `apiOkResponse(code, paginated, page, message, data?,
  headers?)`; `createResponse()` applies them, never call `res.setHeader()`
- a single-record response (get by id, create, update) → `this.entityTagHeader(result.version, body)` as its headers;
  the strong ETag `"<version>-<digest>"` also lets Express answer a matching `If-None-Match` with 304
- a write that checks the client's `version` (update, delete) →
  `this.withExpectedVersion(req, sentVersion, (version) => …)`: the client's `version` comes from the `If-Match`
  header or the body / query `version` field, either is enough, both must agree (400), neither is a 400, and a
  `CONFLICT` when it came from `If-Match` becomes 412
- the authenticated user → `req.user!` in a method taking `AuthenticatedRequest` (pre-approved, §12.6)
- a response built by hand (e.g. `UserController.toSafeUser()`, `EmailLogController.toSafeEmail()`) → include
  `version`, so the client can send it back on update

### 9.4 Never put an infrastructure error's message in a response

**Rule:** Never send an `InfrastructureError`'s message (or its `data`) to the client.
**Why:** It can carry driver internals: hosts, collection and index names, duplicate key values.
**Use cases:**

- `catchExceptionsWrapper()` already answers every infrastructure failure with a generic message
  (`ApiResponseUtils.infrastructureErrorResponse()`) and logs the full error; don't catch it yourself
- a stored field holds a raw provider error (e.g. an email's `error_message`) → drop it from the response

### 9.5 Authenticate every non-public route

**Rule:** Every route starts with `UserValidatorMiddleware(loginApplicationServiceProvider)`, then
`RequestValidatorMiddleware(validator())` on create, update and delete routes. The handler resolves the controller from the
container inside the handler. The file exports `export { router as {Feature}Routes };`, mounted in
`src/presentation/http/routes/index.ts`.
**Why:** Authentication is opt-out per route, so a missing middleware silently makes the route public.
**Use cases:**

- the public routes are only `/health` (`/`, `/live`, `/ready`) and, in `auth.routes.ts`, `/validate` (the Nginx
  `auth_request` endpoint, which checks the token itself), `/login`, `/refresh`, `/forgot-password`,
  `/reset-password`, `/register`, `/verify-email` and `/resend-verification-email`
- a new public route → ask the user first

```typescript
router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(newRoleValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<RoleController>('roleController').create(req, res);
  },
);
export { router as AuthRoleRoutes };
```

**Reference:** `src/presentation/http/routes/auth-role.routes.ts`

### 9.6 Guard role-limited routes with `PermissionMiddleware`

**Rule:** A route limited to some roles adds `PermissionMiddleware(resourceName, action)` right after
`UserValidatorMiddleware`. `action` is a `PermissionAction`: `'read' | 'write' | 'update' | 'delete'`.
**Why:** It answers 403 unless the user's role grants `action` on the Resource named `resourceName`. It reads
`req.user`, loaded with its role and the role's resources, so it costs no query. It fails closed: no user, no loaded
role or no loaded resources is a refusal (`User.hasPermission()` → `Role.hasPermission()`).
**Use cases:**

- a new protected resource → export its name as a constant from the feature's domain model (e.g.
  `EMAIL_LOG_RESOURCE_NAME` in `email.ts`) and add it to `resource.seeder.ts`, so a fresh seed grants it to
  `Administrator`
- an already seeded database (the seeders skip it) → create the resource (`POST /auth/resources`) and grant it to a
  role (`PUT /auth/roles/:id` with the role's full `resource_permissions`)

**Reference:** `src/presentation/http/middleware/PermissionMiddleware.ts`, `src/presentation/http/routes/email-log.routes.ts`
