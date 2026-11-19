# Email: drivers, queue and email log

How the application sends email and keeps the email log. The core rules for every infrastructure service are in
`CLAUDE.md` §11 Infrastructure services. This file holds the email-specific rules.

## Parts

| Part                                                                                          | Location                                                                      |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `IEmailService` (DI token `emailService`), `IEmailJobData`                                    | `src/application/interfaces/infrastructure/email-service.interface.ts`        |
| `EmailServiceFactory`: picks the driver from `EMAIL_DRIVER` and builds the circuit breaker    | `src/infrastructure/email/email-service.factory.ts`                           |
| `BaseEmailService`: `enqueueEmail` / `deliverQueuedEmail`, shared by every driver             | `src/infrastructure/email/base/base-email.service.ts`                         |
| `SMTPEmailService` (nodemailer)                                                               | `src/infrastructure/email/smtp/`                                              |
| `SESEmailService` (`@aws-sdk/client-sesv2`)                                                   | `src/infrastructure/email/ses/`                                               |
| Email queue settings (`IEmailQueueConfig`)                                                    | `src/infrastructure/email/queue/email-queue.config.ts`                        |
| `EmailWorker` (DI token `emailWorker`, worker process only)                                   | `src/application/workers/email/email.worker.ts`                               |
| Entity (`EmailStatus`, `INewEmail`, `IEmail`, `NewEmail`, `Email`, `EMAIL_LOG_RESOURCE_NAME`) | `src/domain/app/email/models/email.ts`                                        |
| Schema, mapper, repository (`email_logs` collection)                                          | `src/infrastructure/persistance/database/repositories/mongoose/email/`        |
| `IEmailRepository` (`IBaseRepository<Email, NewEmail>` plus `findNewestFirst`)                | `src/application/interfaces/repositories/email/email.repository.interface.ts` |
| `EmailLoggerService` (`newId`, `getById`, `getAll`, `get(offset, limit)`, `create`, `update`) | `src/infrastructure/email/email-log/email-logger.service.ts`                  |
| `EmailLogService` (read-only domain service, DI token `emailLogService`)                      | `src/domain/app/email/service/email-log.service.ts`                           |
| `EmailLogController`, `EmailLogRoutes` (mounted at `/app/emails`)                             | `src/presentation/http/{controllers/email,routes}/email-log.*.ts`             |

## Settings

| Variable                                                                                    | Default                           | Meaning                                                                           |
| ------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `EMAIL_DRIVER`                                                                              | `smtp`                            | `smtp` or `aws-ses`. Any other value (`ses` and `console` included) fails startup |
| `EMAIL_FROM`                                                                                | —                                 | Sender address. SES: required, startup fails with `RangeError` without it         |
| `EMAIL_SMTP_HOST`, `_PORT`, `_USERNAME`, `_PASSWORD`, `_SECURE`                             | `localhost`, `587`, —, —, `false` | SMTP server                                                                       |
| `EMAIL_SMTP_CONNECTION_TIMEOUT`, `EMAIL_SMTP_GREETING_TIMEOUT`, `EMAIL_SMTP_SOCKET_TIMEOUT` | `10000`, `10000`, `30000`         | SMTP timeouts (ms)                                                                |
| `EMAIL_SES_REGION`                                                                          | `AWS_REGION`                      | SES region. Startup fails with `DriverError` when neither is set                  |
| `EMAIL_SES_CONNECTION_TIMEOUT`, `EMAIL_SES_REQUEST_TIMEOUT`                                 | `5000`, `10000`                   | SES timeouts (ms)                                                                 |
| `EMAIL_CIRCUIT_FAILURE_THRESHOLD`, `EMAIL_CIRCUIT_RESET_TIMEOUT`                            | `5`, `30000`                      | Circuit breaker of either driver                                                  |
| `EMAIL_QUEUE_NAME`                                                                          | `${APP_NAME}-email-queue`         | BullMQ queue                                                                      |
| `EMAIL_QUEUE_ATTEMPTS`                                                                      | `5`                               | Total tries per email                                                             |
| `EMAIL_QUEUE_RETRY_DELAY`, `EMAIL_QUEUE_BACKOFF`                                            | `10000`, `exponential`            | Delay between tries (ms); `exponential` or `fixed`                                |
| `EMAIL_LOG_TTL_DAYS`                                                                        | `30`                              | Log records expire after this many days (TTL index on `createdAt`), see card 7    |

## Sending

### 1. Send email through `enqueueEmail()`

**Rule:** Domain and application code send email with
`emailService.enqueueEmail(new NewEmail({ ..., status: 'pending' }))`, which resolves once the job is queued.
`sendEmail()` sends at once and logs nothing.
**Why:** Only the queued path is logged and retried.
**Use cases:**

- a user-facing flow (signup, verification) → `enqueueEmail()`, and log a queueing failure without failing the flow
- the caller needs to know the email was delivered → it can't; `IEmailService` only says the email was handed off

**Reference:** `src/application/services/auth/signup.application.service.ts` (`sendVerificationEmail()`)

### 2. Queue first, log second

**Rule:** `enqueueEmail()` queues the whole email (`IEmailJobData`) under an id from `EmailLoggerService.newId()` and
writes nothing to the database. The worker's `deliverQueuedEmail(job)` logs it as `pending` under that id, and only
then sends it.
**Why:** A database outage must neither lose an email nor send one that is not logged. A database failure throws, so
nothing is sent and BullMQ retries the job; the fixed id makes a retry find the same record instead of logging a
duplicate.
**Use cases:**

- `addJob()` fails → `enqueueEmail()` tries to log the email as `failed`, then rethrows the `QueueError`
- the send fails → rethrow so BullMQ retries; on the last attempt (`attemptsMade + 1 >= EMAIL_QUEUE_ATTEMPTS`) mark
  the email `failed` first
- a job runs again for an email that is no longer `pending` → don't send it again
- the log update after a successful send fails (including a lost `VERSION_CONFLICT`) → log that failure, never
  rethrow it: a retried job would find the email still `pending` and send it twice

**Reference:** `src/infrastructure/email/base/base-email.service.ts`

### 3. Add a driver by implementing `transport()` only

**Rule:** A new email driver extends `BaseEmailService` and implements only `transport()` (hand one message to the
provider) and `getDriver()`. The factory builds its circuit breaker and returns a closure (see `CLAUDE.md` §11.2).
**Why:** The queue and log flow (cards 1–2) must behave the same for every provider.
**Reference:** `src/infrastructure/email/smtp/smtp-email.service.ts`, `src/infrastructure/email/email-service.factory.ts`

## The email log

### 4. Only the email infrastructure writes the log

**Rule:** Never write to `email_logs` from domain or application code. `EmailLoggerService` is not in DI: the email
service builds it, and it builds its own `EmailRepository`.
**Why:** The log must match what the queue and the provider actually did (card 2).
**Use cases:**

- read the log in a feature → inject `emailLogService` (read-only) or `IEmailRepository`
- `EmailLoggerService` gets a repository error → it passes it through unchanged (`RepositoryError`,
  `InfrastructureError`, `PersistanceError`, or a stored record's `DomainEntityError`)
- `EmailLoggerService.get(offset, limit)` with an out-of-range page → `RangeError`, because the repository treats a
  `limit` of 0 as "no limit"

### 5. Change an email's status only from `pending`

**Rule:** Move the status only through `Email.markSent(sentOn?)` or `Email.markFailed(errorMessage)`, and only from
`pending`. Any other move throws `DomainEntityError`. A `sent` email needs `sent_on`; a `failed` one needs
`error_message`.
**Why:** Mongoose drops `undefined` keys from `$set`, so `update()` can never clear a stored field. An email that
changed status twice would keep a stale `sent_on` or `error_message`.
**Reference:** `src/domain/app/email/models/email.ts`

### 6. Keep the body only while the email is `pending`

**Rule:** `markSent()` / `markFailed()` empty the body, and the entity rejects a sent or failed email that still has
one. The body and `error_message` never leave the API: `EmailLogController.toSafeEmail()` drops both.
**Why:** The body can hold one-time codes that signup stores only as SHA-256 hashes. `error_message` is the raw
transport error, which can carry hosts and driver details (`CLAUDE.md` §9.4).
**Use cases:**

- the queued job holds a copy of the body until it finishes → finished jobs are deleted (`removeOnComplete` /
  `removeOnFail`)
- a client needs to know why a send failed → it can't; the failure is in the application logs under the email's id

### 7. Know what the stored fields mean

**Rule:** Treat these fields as follows:

- `user_id` is the user who triggered the send. It is stored as an ObjectId with `ref: 'user'`. `INewEmailSchema.user_id`
  is optional in TypeScript only, because the inherited `toFilter()` passes partial filters through
  `toPersistence()`. The schema still requires it, and `EmailMapper.toDomain()` throws `PersistanceError` for a record
  without one.
- `ttl` (seconds) is informational. It does not expire the record.
- Records expire after `EMAIL_LOG_TTL_DAYS` through a TTL index on `createdAt`. When the variable changes, MongoDB
  keeps the existing index's `expireAfterSeconds`: apply the new value with `collMod`, or drop the index so it is
  rebuilt.

### 8. Read the log through the admin endpoints

**Rule:** `GET /api/v1/app/emails?page=&limit=` (newest first, from `IEmailRepository.findNewestFirst()`) and
`GET /api/v1/app/emails/:id`. Both need `read` on the `email-logs` resource (`EMAIL_LOG_RESOURCE_NAME`, see
`CLAUDE.md` §9.6). There are no filters yet.
**Reference:** `src/presentation/http/routes/email-log.routes.ts`

## AWS SES driver

### 9. Take SES credentials from the AWS default provider chain

**Rule:** Never put AWS access keys in env config. The ECS task role supplies them in production, an AWS profile
locally.
**Deployment prerequisites:**

- the ECS task role needs `ses:SendEmail` on the sender identity and `ses:GetAccount` for the health check
- `EMAIL_FROM` must be an SES identity (address or domain) verified in the region
- without SES production access, the account is in the sandbox and SES accepts only verified recipients

### 10. Translate SES errors without keeping the SDK error

**Rule:** SES errors become `SesError` (`EMAIL_ERROR`) with `data.code` (the SES exception name or the network error
code), `data.fault` (`'client'` when SES refused the request), `data.httpStatusCode`, `data.requestId`, and in
`data.cause` a copy holding only the original's name, message and stack.
**Why:** The SDK error carries the raw HTTP response.
**Use cases:**

- the `aws_ses` circuit breaker counts network errors, timeouts, credential failures and server faults, never client
  faults (`isSesOutage()`), so a rejected message (`MessageRejected`) doesn't open it
- the client sets `throwOnRequestTimeout`: without it, an exceeded `requestTimeout` only logs a warning and the request
  keeps waiting
- `health()` calls `GetAccount`, bounded to one request's timeouts

## SMTP driver

### 11. Count only SMTP outages

**Rule:** The `smtp` circuit breaker counts outages only: `isSmtpOutage()` ignores nodemailer's `EENVELOPE` /
`EMESSAGE`, which reject one message, not the server.
**Reference:** `src/infrastructure/email/email-service.factory.ts`
