/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import {
  AuthorizationErrorException,
  EndpointDisabledException,
  InvalidParameterException,
  PublishCommand,
  SNSClient,
  SNSServiceException,
} from '@aws-sdk/client-sns';

import { CircuitBreaker } from '@/infrastructure/core/circuit-breaker/circuit-breaker';
import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { SNSDriver } from './driver/sns.driver';
import { isSnsOutage } from './error/sns-error.guards';
import { SnsError } from './error/sns.error';
import { SNSPushNotificationService } from './sns-push-notification.service';

import type { ISNSConfig } from './driver/sns.config';
import type { PublishCommandOutput } from '@aws-sdk/client-sns';

// Every publish these tests make is stubbed; the client never opens a connection.
const client = new SNSClient({ region: 'us-east-1' });

class StubSNSDriver extends SNSDriver {
  override client(): SNSClient {
    return client;
  }
}

const ENDPOINT_ARN = 'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/test-app/0f1e2d3c';
const TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:broadcast';

/**
 * Build a driver config.
 *
 * @param {string | undefined} broadcastTopicArn - The configured broadcast topic; undefined disables broadcasts.
 * @returns {ISNSConfig} The config.
 */
function driverConfig(broadcastTopicArn: string | undefined): ISNSConfig {
  return {
    driverName: 'notification',
    singleton: true,
    deferred: false,
    region: 'us-east-1',
    broadcastTopicArn,
    connectionTimeout: 1000,
    requestTimeout: 1000,
    circuitBreaker: { failureThreshold: 0, resetTimeout: 1000 },
  };
}

/**
 * Build the SNS answer to an accepted publish.
 *
 * @returns {Promise<PublishCommandOutput>} The resolved output.
 */
function published(): Promise<PublishCommandOutput> {
  return Promise.resolve({ MessageId: 'message-1', $metadata: { httpStatusCode: 200 } });
}

/**
 * Build the error SNS returns for a device endpoint that is disabled.
 *
 * @returns {EndpointDisabledException} The client-fault exception.
 */
function endpointDisabled(): EndpointDisabledException {
  return new EndpointDisabledException({
    message: 'Endpoint is disabled',
    $metadata: { httpStatusCode: 400, requestId: 'request-1' },
  });
}

/**
 * Build an error shaped like Node's for a refused connection.
 *
 * @returns {Error & { code: string }} The error.
 */
function connectionRefused(): Error & { code: string } {
  return Object.assign(new Error('connect ECONNREFUSED 52.0.0.1:443'), { code: 'ECONNREFUSED' });
}

interface ITestService {
  service: SNSPushNotificationService;
  breaker: CircuitBreaker;
  driver: SNSDriver;
}

/**
 * Create the service with a breaker that opens on the first counted failure.
 *
 * @param {{ broadcastTopicArn: string | undefined }} options - The configured broadcast topic; undefined disables
 * broadcasts. An explicit `undefined` is kept, unlike a defaulted parameter.
 * @returns {ITestService} The service and its collaborators.
 */
function createService(
  options: { broadcastTopicArn: string | undefined } = { broadcastTopicArn: TOPIC_ARN },
): ITestService {
  const config = driverConfig(options.broadcastTopicArn);
  const breaker = new CircuitBreaker({ name: 'aws_sns', ...config.circuitBreaker, isFailure: isSnsOutage });
  const driver = new StubSNSDriver(config);
  return { service: new SNSPushNotificationService(driver, breaker), breaker, driver };
}

describe('SNSPushNotificationService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('refuses a driver whose client is not initialized', () => {
    expect(
      () => new SNSPushNotificationService(new SNSDriver(driverConfig(TOPIC_ARN)), createService().breaker),
    ).toThrow(SnsError);
  });

  it('is the notification service, registered as a non-deferred singleton', () => {
    const { service } = createService();

    expect(service.serviceName()).toBe('notification');
    expect(service.singleton()).toBe(true);
    expect(service.deferred()).toBe(false);
  });

  it("publishes to the device's endpoint as SNS's per-platform JSON, serializing object payloads", async () => {
    const send = jest.spyOn(client, 'send').mockImplementation(published);
    const { service } = createService();
    const apnsPayload = { aps: { alert: { title: 'Inbox', body: 'You have a new message' } } };
    const gcmPayload = JSON.stringify({ fcmV1Message: { message: { data: { id: '42' } } } });

    await service.sendNotification(ENDPOINT_ARN, {
      default: 'You have a new message',
      APNS: apnsPayload,
      GCM: gcmPayload,
    });

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(PublishCommand);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TargetArn: ENDPOINT_ARN,
          MessageStructure: 'json',
          Message: JSON.stringify({
            default: 'You have a new message',
            APNS: JSON.stringify(apnsPayload),
            GCM: gcmPayload,
          }),
        },
      }),
    );
  });

  it('broadcasts to the configured topic', async () => {
    const send = jest.spyOn(client, 'send').mockImplementation(published);
    const { service } = createService();

    await service.broadcastNotification({ default: 'Maintenance tonight' });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TopicArn: TOPIC_ARN,
          MessageStructure: 'json',
          Message: JSON.stringify({ default: 'Maintenance tonight' }),
        },
      }),
    );
  });

  it('refuses to broadcast without a configured topic, publishing nothing', async () => {
    const send = jest.spyOn(client, 'send').mockImplementation(published);
    const { service, breaker } = createService({ broadcastTopicArn: undefined });

    const thrown = await service.broadcastNotification({ default: 'Hello' }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'NOTIFICATION_ERROR' });
    expect(send).not.toHaveBeenCalled();
    expect(breaker.state).toBe('closed');
  });

  it.each([
    ['has no default string', { title: 'Hello' }],
    ['cannot be serialized', { default: 'Hello', GCM: { count: BigInt(1) } }],
  ])('throws a TypeError for a message that %s, publishing nothing', async (_label, message) => {
    const send = jest.spyOn(client, 'send').mockImplementation(published);
    const { service, breaker } = createService();

    await expect(service.sendNotification(ENDPOINT_ARN, message)).rejects.toBeInstanceOf(TypeError);

    expect(send).not.toHaveBeenCalled();
    expect(breaker.state).toBe('closed');
  });

  it('wraps a rejection in an SnsError carrying the target and only safe fields of the SDK error', async () => {
    const rejected = endpointDisabled();
    rejected.$response = { statusCode: 400, headers: { 'x-amzn-requestid': 'request-1' }, body: undefined };
    jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(rejected));
    const { service } = createService();

    const thrown = await service.sendNotification(ENDPOINT_ARN, { default: 'Hello' }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(SnsError);
    expect(thrown).toMatchObject({
      type: 'NOTIFICATION_ERROR',
      data: {
        target: ENDPOINT_ARN,
        code: 'EndpointDisabledException',
        fault: 'client',
        httpStatusCode: 400,
        requestId: 'request-1',
      },
    });
    const cause = thrown instanceof SnsError ? thrown.data?.cause : undefined;
    expect(cause).toBeInstanceOf(Error);
    expect(cause).not.toBe(rejected);
    expect(cause).toMatchObject({ name: 'EndpointDisabledException', message: 'Endpoint is disabled' });
    expect(cause).not.toHaveProperty('$response');
    expect(cause).not.toHaveProperty('$metadata');
  });

  it.each([
    ['a refused connection', connectionRefused(), 'ECONNREFUSED'],
    ['a timeout', Object.assign(new Error('Request timed out'), { name: 'TimeoutError' }), 'TimeoutError'],
  ])('wraps %s in an SnsError without a fault', async (_label, failure, code) => {
    jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(failure));
    const { service } = createService();

    const thrown = await service.sendNotification(ENDPOINT_ARN, { default: 'Hello' }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(SnsError);
    expect(thrown).toMatchObject({ type: 'NOTIFICATION_ERROR', data: { code, fault: undefined } });
  });

  it('stops calling SNS once a connection failure opens the circuit', async () => {
    const send = jest
      .spyOn(client, 'send')
      .mockImplementation((): Promise<never> => Promise.reject(connectionRefused()));
    const { service, breaker } = createService();

    await expect(service.sendNotification(ENDPOINT_ARN, { default: 'Hello' })).rejects.toBeInstanceOf(SnsError);
    await expect(service.broadcastNotification({ default: 'Hello' })).rejects.toBeInstanceOf(CircuitOpenError);

    expect(send).toHaveBeenCalledTimes(1);
    expect(breaker.state).toBe('open');
  });

  it('opens the circuit on a server fault', async () => {
    const serverFault = new SNSServiceException({
      name: 'InternalErrorException',
      $fault: 'server',
      $metadata: { httpStatusCode: 500 },
      message: 'Internal error',
    });
    jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(serverFault));
    const { service, breaker } = createService();

    await expect(service.sendNotification(ENDPOINT_ARN, { default: 'Hello' })).rejects.toBeInstanceOf(SnsError);

    expect(breaker.state).toBe('open');
  });

  it.each([
    ['EndpointDisabledException', endpointDisabled],
    [
      'InvalidParameterException',
      (): InvalidParameterException =>
        new InvalidParameterException({ message: 'Invalid parameter', $metadata: { httpStatusCode: 400 } }),
    ],
    [
      'AuthorizationErrorException',
      (): AuthorizationErrorException =>
        new AuthorizationErrorException({ message: 'Not authorized', $metadata: { httpStatusCode: 403 } }),
    ],
  ])('keeps the circuit closed when SNS refuses the notification with %s', async (_name, refusal) => {
    const send = jest.spyOn(client, 'send').mockImplementation((): Promise<never> => Promise.reject(refusal()));
    const { service, breaker } = createService();

    await expect(service.sendNotification(ENDPOINT_ARN, { default: 'Hello' })).rejects.toBeInstanceOf(SnsError);
    await expect(service.sendNotification(ENDPOINT_ARN, { default: 'Hello' })).rejects.toBeInstanceOf(SnsError);

    expect(send).toHaveBeenCalledTimes(2);
    expect(breaker.state).toBe('closed');
  });

  it('reports its single circuit breaker for the health check, even while closed', () => {
    const { service } = createService();

    expect(service.circuitBreakerStatuses()).toEqual([
      { name: 'aws_sns', state: 'closed', failureCount: 0, failureThreshold: 0 },
    ]);
  });

  it('rejects every notification it is asked to queue', async () => {
    const { service } = createService();

    const thrown = await service
      .enqueueNotification({
        triggered_by: 'test',
        triggered_on: new Date(),
        topic: 'inbox',
        channel: 'push notification',
        data: { default: 'Hello' },
      })
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'NOTIFICATION_ERROR' });
  });

  it('shuts the driver down', async () => {
    const { service, driver } = createService();
    const shutdown = jest.spyOn(driver, 'shutdown');

    await service.shutdown();

    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});

describe('isSnsOutage', () => {
  it('counts an SnsError without a fault, such as a network error or a timeout', () => {
    expect(isSnsOutage(new SnsError('failed', { code: 'ECONNREFUSED' }))).toBe(true);
  });

  it('counts an SnsError for a server fault', () => {
    expect(isSnsOutage(new SnsError('failed', { code: 'InternalErrorException', fault: 'server' }))).toBe(true);
  });

  it('does not count an SnsError for a client fault', () => {
    expect(isSnsOutage(new SnsError('rejected', { code: 'EndpointDisabledException', fault: 'client' }))).toBe(false);
  });

  it('does not count an error that is not an SnsError', () => {
    expect(isSnsOutage(connectionRefused())).toBe(false);
  });
});
