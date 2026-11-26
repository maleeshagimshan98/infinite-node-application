/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as path from 'path';

import { DriverError } from '@/infrastructure/core/errors/driver.error';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';
import { PushNotificationServiceFactory } from './push-notification-service.factory';
import { SNSPushNotificationService } from './sns/sns-push-notification.service';

const PUSH_NOTIFICATION_ENV = [
  'PUSH_NOTIFICATION_DRIVER',
  'PUSH_NOTIFICATION_SNS_REGION',
  'PUSH_NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD',
  'AWS_REGION',
  'AWS_PROFILE',
];

describe('PushNotificationServiceFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of PUSH_NOTIFICATION_ENV) {
      delete process.env[name];
    }
    // Keep the developer's own ~/.aws/config from supplying a region.
    const missing = path.join(__dirname, 'no-such-aws-file');
    process.env.AWS_CONFIG_FILE = missing;
    process.env.AWS_SHARED_CREDENTIALS_FILE = missing;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each([['inmemory'], ['in-memory'], [undefined]])(
    'builds the in-memory notification service for PUSH_NOTIFICATION_DRIVER=%s',
    async (driver) => {
      if (driver) {
        process.env.PUSH_NOTIFICATION_DRIVER = driver;
      }

      await expect(new PushNotificationServiceFactory().create()).resolves.toBeInstanceOf(InMemoryNotificationService);
    },
  );

  it.each(['aws-sns', 'AWS-SNS'])(
    'builds the SNS push notification service for PUSH_NOTIFICATION_DRIVER=%s',
    async (driver) => {
      process.env.PUSH_NOTIFICATION_DRIVER = driver;
      process.env.PUSH_NOTIFICATION_SNS_REGION = 'eu-west-1';

      const service = await new PushNotificationServiceFactory().create();

      expect(service).toBeInstanceOf(SNSPushNotificationService);
      expect(service.circuitBreakerStatuses?.()).toEqual([
        { name: 'aws_sns', state: 'closed', failureCount: 0, failureThreshold: 5 },
      ]);
      await service.shutdown?.();
    },
  );

  it('fails to build the SNS push notification service without an AWS region', async () => {
    process.env.PUSH_NOTIFICATION_DRIVER = 'aws-sns';

    await expect(new PushNotificationServiceFactory().create()).rejects.toBeInstanceOf(DriverError);
  });

  it('fails to build the SNS push notification service with an invalid circuit breaker setting', async () => {
    process.env.PUSH_NOTIFICATION_DRIVER = 'aws-sns';
    process.env.PUSH_NOTIFICATION_SNS_REGION = 'eu-west-1';
    process.env.PUSH_NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD = '-1';

    await expect(new PushNotificationServiceFactory().create()).rejects.toBeInstanceOf(RangeError);
  });

  it.each(['sns', 'fcm'])('rejects PUSH_NOTIFICATION_DRIVER=%s', async (driver) => {
    process.env.PUSH_NOTIFICATION_DRIVER = driver;

    const thrown = await new PushNotificationServiceFactory().create().catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'DRIVER_ERROR', data: { notificationType: driver } });
  });
});
