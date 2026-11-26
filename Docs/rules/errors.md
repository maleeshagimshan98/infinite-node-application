# Errors → HTTP status (§10)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

---

## 10. Errors → HTTP status

`BaseController.catchExceptionsWrapper()` turns every error into a response:

| Thrown error                                                      | HTTP                                                        | Response message                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| `PaginationException`, `RouteParamException`, `DomainEntityError` | 400                                                         | The error's message               |
| `VersionParamException` (no client `version` sent, or the `If-Match` value ≠ the `version` field) | 400                                                         | The error's message               |
| `PreconditionFailedException` (stale or unusable `If-Match`)      | 412                                                         | The error's message               |
| `DomainServiceError`                                              | Per type, below                                             | The error's message, except below |
| `InfrastructureError` (reached the controller unwrapped)          | 503 for `NETWORK_ERROR` / `CONNECTION_ERROR`, otherwise 500 | Generic                           |
| Anything else (including an unwrapped `RepositoryError`)          | 500                                                         | Generic                           |

| `DomainServiceError` type | HTTP                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `AUTHENTICATION_ERROR`    | 401                                                                                           |
| `USER_PERMISSION_ERROR`   | 403                                                                                           |
| `NOT_FOUND`               | 404                                                                                           |
| `ALREADY_EXISTS`          | 400                                                                                           |
| `CONFLICT`                | 409 (412 when the client's `version` came from `If-Match`): the record changed since the client read it (§7.6) |
| `VALIDATION_ERROR`        | 400 (response includes `data`)                                                                |
| `INVALID_OPERATION`       | 400 (response includes `data`)                                                                |
| `INCOMPLETE_MODEL`        | 400                                                                                           |
| `UNKNOWN_ERROR`           | 500 (response includes `data`)                                                                |
| `INFRASTRUCTURE_ERROR`    | 503 when `data.type` is `NETWORK_ERROR` / `CONNECTION_ERROR`, otherwise 500 — generic message |

- "Generic" is `ErrorResponseMessages.SERVER_ERROR()` (500) or `SERVICE_UNAVAILABLE()` (503); the full error is logged.
- `wrapInfrastructureErrors()` maps a `RepositoryError` first, with a fixed client-safe message and without calling
  `onError`: `DUPLICATE_KEY` → `ALREADY_EXISTS`, `INVALID_ID` → `VALIDATION_ERROR`, `VERSION_CONFLICT` → `CONFLICT`
  ("The record was changed by another request. Reload it and try again.").
- `InfrastructureErrorType`s (`DATABASE_ERROR`, `NETWORK_ERROR`, `CONNECTION_ERROR`, `CACHE_ERROR`, `QUEUE_ERROR`,
  `SOCKET_ERROR`, `EMAIL_ERROR`, `STORAGE_ERROR`, `NOTIFICATION_ERROR`, `DRIVER_ERROR`) are not `DomainServiceError`
  types; the original travels in `data.type`.
- `UserValidatorMiddleware` answers an `INFRASTRUCTURE_ERROR` during authentication with the same generic 503/500 (an
  outage is not an authentication failure); any other `DomainServiceError` there is a 401 with its message.
- Outside the controllers, two app-level handlers mounted after every route (`src/app/core/middleware/`) answer in
  JSON. `notFoundMiddleware` gives a request no route matched a 404. `errorHandlerMiddleware` gives a body the JSON
  parser rejects a 400 (not valid JSON) or a 413 (too large), with a fixed message, and anything else the generic 500,
  logged with its stack.
