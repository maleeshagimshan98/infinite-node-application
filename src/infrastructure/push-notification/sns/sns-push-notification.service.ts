/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { PublishCommand, SNSServiceException } from '@aws-sdk/client-sns';

import type { ICircuitBreaker } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';
import type { IPushNotificationService } from '@/application/interfaces/infrastructure/push-notification/push-notification-service.interface';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { SnsError } from './error/sns.error';

import type { SNSDriver } from './driver/sns.driver';
import type { PublishCommandInput, SNSClient } from '@aws-sdk/client-sns';

/**
 * Name the failure: the SNS exception's name, or a network error's code (e.g. ECONNREFUSED).
 *
 * @param {unknown} error - What the SNS client threw.
 * @returns {string | undefined} The failure's code, or undefined for a value that is not an Error.
 */
function snsErrorCode(error: unknown): string | undefined {
  if (error instanceof SNSServiceException) {
    return error.name;
  }
  if (error instanceof Error) {
    return 'code' in error && typeof error.code === 'string' ? error.code : error.name;
  }
  return undefined;
}

/**
 * Copy the parts of a thrown value that are safe to keep. An SDK error holds the raw HTTP response, so only its
 * name, message and stack are kept.
 *
 * @param {unknown} error - What the SNS client threw.
 * @returns {Error} A new Error with only the original's name, message and stack.
 */
function safeCause(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(String(error));
  }
  const copy = new Error(error.message);
  copy.name = error.name;
  if (error.stack) {
    copy.stack = error.stack;
  }
  return copy;
}

/**
 * Translate what the SNS client threw into an SnsError.
 *
 * @param {unknown} error - What the SNS client threw.
 * @param {string} target - The endpoint or topic ARN the message was published to.
 * @returns {SnsError} NOTIFICATION_ERROR with the target, code, fault, HTTP status, request id and a safe copy of
 * the original.
 */
function toSnsError(error: unknown, target: string): SnsError {
  const serviceError = error instanceof SNSServiceException ? error : undefined;
  return new SnsError(`Failed to publish notification: ${error instanceof Error ? error.message : 'Unknown error'}`, {
    target,
    code: snsErrorCode(error),
    fault: serviceError?.$fault,
    httpStatusCode: serviceError?.$metadata.httpStatusCode,
    requestId: serviceError?.$metadata.requestId,
    cause: safeCause(error),
  });
}

/**
 * Serialize a message into SNS's per-platform JSON message (`MessageStructure: 'json'`).
 *
 * SNS needs every value in that JSON to be a string, and silently ignores a key whose value is not, so platform
 * payloads given as objects (e.g. `APNS: { aps: { alert: 'Hi' } }`) are serialized to JSON strings here. String
 * values are kept as given.
 *
 * @param {Record<string, unknown>} message - A `default` string, plus optional payloads keyed by SNS platform
 * (`GCM`, `APNS`, `APNS_SANDBOX`, …).
 * @returns {string} The JSON message to publish.
 * @throws {TypeError} When `default` is not a string, or a payload cannot be serialized (e.g. a circular object).
 */
function toSnsMessage(message: Record<string, unknown>): string {
  if (typeof message.default !== 'string') {
    throw new TypeError(
      'A push notification needs a "default" string: SNS delivers it to every platform the message has no payload for',
    );
  }

  const perPlatform: Record<string, string> = {};
  for (const [platform, payload] of Object.entries(message)) {
    perPlatform[platform] = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }
  return JSON.stringify(perPlatform);
}

/**
 * AWS SNS Push Notification Service
 *
 * A thin wrapper around SNS `Publish`: sends a push notification to one device's platform endpoint, or broadcasts
 * one to the topic every device is subscribed to. Publishes go through a circuit breaker, so while SNS cannot be
 * reached they are rejected immediately instead of each waiting out the SDK's retries and timeouts.
 *
 * Messages use SNS's per-platform JSON structure: a `default` string plus optional payloads keyed by platform.
 * Device registration (creating platform endpoints, subscribing them to the broadcast topic) is not part of this
 * service.
 *
 * @class SNSPushNotificationService
 * @implements {IPushNotificationService}
 *
 * @example
 * ```typescript
 * const notificationService = new SNSPushNotificationService(driver, circuitBreaker);
 * await notificationService.sendNotification('arn:aws:sns:eu-west-1:123456789012:endpoint/GCM/my-app/1234', {
 *   default: 'You have a new message',
 *   GCM: { fcmV1Message: { message: { notification: { title: 'Inbox', body: 'You have a new message' } } } },
 *   APNS: { aps: { alert: { title: 'Inbox', body: 'You have a new message' } } },
 * });
 * ```
 */
export class SNSPushNotificationService implements IPushNotificationService {
  private readonly driver: SNSDriver;

  /**
   * SNS client instance from the driver layer
   *
   * @type {SNSClient}
   */
  private readonly client: SNSClient;

  /**
   * Circuit breaker guarding every publish
   *
   * @type {ICircuitBreaker}
   */
  private readonly circuitBreaker: ICircuitBreaker;

  /**
   * Creates an instance of SNSPushNotificationService from an initialized SNS driver and the breaker guarding its
   * publishes
   *
   * @param {SNSDriver} driver - The initialized SNS driver.
   * @param {ICircuitBreaker} circuitBreaker - The breaker guarding the publishes.
   * @throws {SnsError} NOTIFICATION_ERROR when the driver has no client (it was not initialized).
   */
  constructor(driver: SNSDriver, circuitBreaker: ICircuitBreaker) {
    this.driver = driver;
    this.circuitBreaker = circuitBreaker;
    const client = this.driver.client();
    if (!client) {
      throw new SnsError('Invalid SNS client provided to SNSPushNotificationService', {});
    }
    this.client = client;
  }

  /**
   * Get the service name for this push notification implementation
   *
   * @returns {'pushNotification'} The service name identifier
   */
  serviceName(): 'pushNotification' {
    return 'pushNotification';
  }

  /**
   * Indicates that this notification service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this notification service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  /**
   * Get the underlying SNS driver instance
   *
   * @returns {SNSDriver} The SNS driver instance
   */
  getDriver(): SNSDriver {
    return this.driver;
  }

  /**
   * Report the SNS circuit breaker's state for the health check
   *
   * @returns {ICircuitBreakerStatus[]} The single SNS breaker's status
   */
  circuitBreakerStatuses(): ICircuitBreakerStatus[] {
    return [this.circuitBreaker.circuitBreakerStatus()];
  }

  /**
   * Destroy the SNS client
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    await this.driver.shutdown();
  }

  /**
   * Send a push notification to one device
   *
   * @param {string} to - The SNS platform endpoint ARN of the device
   * @param {Record<string, unknown>} message - A `default` string, plus optional payloads keyed by SNS platform
   * (`GCM`, `APNS`, …); object payloads are serialized to JSON
   * @returns {Promise<void>} resolving when SNS has accepted the notification
   * @throws {TypeError} When the message has no `default` string or cannot be serialized; nothing is published
   * @throws {SnsError} NOTIFICATION_ERROR when SNS cannot be reached or refuses the notification; `data.code` holds
   * the SNS exception name (e.g. EndpointDisabledException) or the network error code, `data.fault` is 'client' when SNS
   * refused it
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SNS circuit is open and the notification was not attempted
   */
  async sendNotification(to: string, message: Record<string, unknown>): Promise<void> {
    await this.publish({ TargetArn: to }, to, message);
  }

  /**
   * Broadcast a push notification to every device subscribed to the configured broadcast topic
   *
   * @param {Record<string, unknown>} message - A `default` string, plus optional payloads keyed by SNS platform
   * (`GCM`, `APNS`, …); object payloads are serialized to JSON
   * @returns {Promise<void>} resolving when SNS has accepted the notification
   * @throws {InfrastructureError} NOTIFICATION_ERROR when PUSH_NOTIFICATION_SNS_BROADCAST_TOPIC_ARN is not set
   * @throws {TypeError} When the message has no `default` string or cannot be serialized; nothing is published
   * @throws {SnsError} NOTIFICATION_ERROR when SNS cannot be reached or refuses the notification
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SNS circuit is open and the notification was not attempted
   */
  async broadcastNotification(message: Record<string, unknown>): Promise<void> {
    const topicArn = this.driver.config().broadcastTopicArn;
    if (!topicArn) {
      throw new InfrastructureError(
        'The SNS push notification driver cannot broadcast: PUSH_NOTIFICATION_SNS_BROADCAST_TOPIC_ARN is not set',
        'NOTIFICATION_ERROR',
      );
    }
    await this.publish({ TopicArn: topicArn }, topicArn, message);
  }

  /**
   * Publish a message to an endpoint or topic through the circuit breaker
   *
   * @param {Pick<PublishCommandInput, 'TargetArn' | 'TopicArn'>} destination - Where SNS delivers the message
   * @param {string} target - The destination's ARN, kept on a failure's SnsError
   * @param {Record<string, unknown>} message - The per-platform message
   * @returns {Promise<void>} resolving when SNS has accepted the message
   * @throws {TypeError} When the message has no `default` string or cannot be serialized
   * @throws {SnsError} NOTIFICATION_ERROR when SNS cannot be reached or refuses the message
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SNS circuit is open and the message was not attempted
   */
  private async publish(
    destination: Pick<PublishCommandInput, 'TargetArn' | 'TopicArn'>,
    target: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    // Serialized before the breaker: a caller's malformed message is not an SNS failure.
    const command = new PublishCommand({ ...destination, Message: toSnsMessage(message), MessageStructure: 'json' });

    await this.circuitBreaker.execute(() =>
      this.client.send(command).catch((error: unknown) => {
        throw toSnsError(error, target);
      }),
    );
  }
}
