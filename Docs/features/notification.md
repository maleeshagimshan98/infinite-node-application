# Notifications: drivers and notification log

How the application sends push notifications and how the notification log is built. The core rules for every
infrastructure service are in `CLAUDE.md` §11 Infrastructure services. This file holds the notification-specific rules.

**Status:** push notifications go out directly through AWS SNS. There is no SMS driver, and nothing queues or logs a
notification yet: the notification manager that will do both is planned (`Docs/TODO.yml`, NotificationManagerService).

## Parts

| Part                                                                                                                   | Location                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `INotificationManager` (DI token `notification`)                                                                       | `src/application/interfaces/infrastructure/notification/notification-manager.interface.ts`  |
| Record shape (`INotification`, `INotificationChannel`, `INotificationStatus`) and enqueue input (`INewNotification`)   | `src/application/interfaces/infrastructure/notification/notification.interface.ts`          |
| `NotificationServiceFactory`: picks the driver from `NOTIFICATION_DRIVER`                                              | `src/infrastructure/notification/notification-service.factory.ts`                           |
| `InMemoryNotificationService` (placeholder; sends nothing)                                                             | `src/infrastructure/notification/in-memory/`                                                |
| `SNSPushNotificationService` (`@aws-sdk/client-sns`)                                                                   | `src/infrastructure/notification/sns/`                                                      |
| Entity (`NOTIFICATION_CHANNELS`, `NOTIFICATION_STATUSES`, `INewNotificationRecord`, `INotificationRecord`, `NewNotification`, `Notification`) | `src/domain/app/notification/models/notification.ts`                                        |
| Schema, mapper, repository (`notification_logs` collection)                                                            | `src/infrastructure/persistance/database/repositories/mongoose/notification/`               |
| `INotificationRepository` (type alias of `IBaseRepository<Notification, NewNotification>` for now)                     | `src/application/interfaces/repositories/notification/notification.repository.interface.ts` |
| `NotificationLoggerService` (`newId`, `getById`, `getAll`, `get(offset, limit)`, `create`, `update`)                   | `src/infrastructure/notification/notification-log/notification-logger.service.ts`           |

## Settings

| Variable                                                                       | Default         | Meaning                                                                                  |
| ------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------- |
| `NOTIFICATION_DRIVER`                                                          | `inmemory`      | `inmemory` / `in-memory` or `aws-sns`. Any other value fails startup with `DRIVER_ERROR` |
| `NOTIFICATION_SNS_REGION`                                                      | `AWS_REGION`    | SNS region. Startup fails with `DriverError` when neither is set                         |
| `NOTIFICATION_SNS_BROADCAST_TOPIC_ARN`                                         | —               | The topic every device is subscribed to; needed only for broadcasts                      |
| `NOTIFICATION_SNS_CONNECTION_TIMEOUT`, `NOTIFICATION_SNS_REQUEST_TIMEOUT`      | `5000`, `10000` | SNS timeouts (ms)                                                                        |
| `NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD`, `NOTIFICATION_CIRCUIT_RESET_TIMEOUT` | `5`, `30000`    | The `aws_sns` circuit breaker                                                            |

## Sending (AWS SNS)

### 1. Publish to one device or to the broadcast topic

**Rule:** `sendNotification(to, message)` publishes to one device; `to` is the device's SNS platform endpoint ARN.
`broadcastNotification(message)` publishes to `NOTIFICATION_SNS_BROADCAST_TOPIC_ARN`.
**Why:** The service is a thin wrapper around SNS `Publish`. Creating platform endpoints and subscribing them to the
topic is not part of it.
**Use cases:**

- broadcast without `NOTIFICATION_SNS_BROADCAST_TOPIC_ARN` → throws `InfrastructureError` `NOTIFICATION_ERROR`
- `enqueueNotification()` → rejects every notification on every driver, because queueing and logging belong to the
  notification manager (card 5)

**Reference:** `src/infrastructure/notification/sns/sns-push-notification.service.ts`

### 2. Give every message a `default` string

**Rule:** `message` is SNS's per-platform JSON message (`MessageStructure: 'json'`): a `default` string, which SNS
delivers to any platform without its own payload, plus optional payloads keyed by platform (`GCM`, `APNS`,
`APNS_SANDBOX`, …). Object payloads are serialized to JSON strings.
**Why:** SNS silently ignores a platform key whose value is not a string.
**Use cases:**

- a message without a `default` string, or one that cannot be serialized → `TypeError`, and nothing is sent

### 3. Translate SNS errors without keeping the SDK error

**Rule:** SNS errors become `SnsError` (`NOTIFICATION_ERROR`) with `data.target` (the endpoint or topic ARN),
`data.code` (the SNS exception name, e.g. `EndpointDisabledException`, or the network error code), `data.fault`,
`data.httpStatusCode`, `data.requestId`, and in `data.cause` a copy holding only the original's name, message and
stack, as for SES.
**Why:** The SDK error carries the raw HTTP response.
**Use cases:**

- the `aws_sns` circuit breaker counts network errors, timeouts, credential failures and server faults, never client
  faults (`isSnsOutage()`), so a disabled device endpoint doesn't open it
- `health()` calls `ListTopics`, bounded to one request's timeouts

### 4. Take SNS credentials from the AWS default provider chain

**Rule:** Never put AWS access keys in env config, as for SES (`Docs/features/email.md` card 9).
**Deployment prerequisites:** the ECS task role needs `sns:Publish` on the platform endpoints and the broadcast topic,
and `sns:ListTopics` for the health check.

## The notification log

The notification log records each notification the application sends or tries to send, one record per channel: which
service triggered it and when, the topic, the channel, the provider that delivers it, its payload and its status.
**Nothing writes it yet**, and there are no endpoints. They will mirror the email log (`/app/emails`).

### 5. Only the notification infrastructure writes the log

**Rule:** The notification manager (`INotificationManager`, DI token `notification`) will log through
`NotificationLoggerService`, as the email service does through `EmailLoggerService`. `NotificationLoggerService` is not
in DI: the notification manager will build it, and it builds its own `NotificationRepository`.
**Use cases:**

- read the log → `notificationRepository` is auto-registered for reads
- the future read-only domain service → name it `NotificationLogService`, mirroring `EmailLogService`, so it stays
  apart from `NotificationLoggerService`
- `NotificationLoggerService` gets a repository error → it passes it through unchanged (`RepositoryError`,
  `InfrastructureError`, `PersistanceError`, or a stored record's `DomainEntityError`)
- `get(offset, limit)` with an out-of-range page → `RangeError`, because the repository treats a `limit` of 0 as
  "no limit"

### 6. Log one record per channel

**Rule:** Sending the same notification by email and SMS logs two records. Build each `NewNotification` from
`INewNotificationRecord`, not `INewNotification`. A logged `Notification` is built from
`INotificationRecord = INotification & { version: number }`.
**Why:** `INewNotification` is what callers pass to `enqueueNotification()`. It has no `id`, `status` or
`service_provider`; the notification manager sets them. `INotification` itself leaves the version out, because the
version is a persistence concern.

### 7. Validate the record's fields

**Rule:**

- `triggered_on` must be a `Date`; the entity rejects a string with `DomainEntityError`. A queued notification's job
  data holds a string after BullMQ's JSON round trip, so convert it first.
- `channel` and `status` accept only `NOTIFICATION_CHANNELS` / `NOTIFICATION_STATUSES`, in both the entity and the
  schema's `enum`. Add a channel to `INotificationChannel` and `NOTIFICATION_CHANNELS` together.
- `data` is a Mixed field, stored as given. The schema sets `minimize: false`, so an empty payload is kept as `{}`.
  `update()` replaces `data` whole.
- Records do not expire: unlike the email log, there is no TTL index.

**Reference:** `src/domain/app/notification/models/notification.ts`

### 8. Change a notification's status only from `pending`

**Rule:** Move the status only through `Notification.markSent()` or `Notification.markFailed()`, and only from
`pending`. Any other move throws `DomainEntityError`.
**Why:** A job that runs again must neither send a finished notification a second time nor relabel a sent one as
failed.
