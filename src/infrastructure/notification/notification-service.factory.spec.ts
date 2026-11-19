/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as path from 'path';

import { DriverError } from '@/infrastructure/core/errors/driver.error';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { InMemoryNotificationService } from './in-memory/in-memory-notification.service';
import { NotificationServiceFactory } from './notification-service.factory';
import { SNSPushNotificationService } from './sns/sns-push-notification.service';

const NOTIFICATION_ENV = [
  'NOTIFICATION_DRIVER',
  'NOTIFICATION_SNS_REGION',
  'NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD',
  'AWS_REGION',
  'AWS_PROFILE',
];

describe('NotificationServiceFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of NOTIFICATION_ENV) {
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
    'builds the in-memory notification service for NOTIFICATION_DRIVER=%s',
    async (driver) => {
      if (driver) {
        process.env.NOTIFICATION_DRIVER = driver;
      }

      await expect(new NotificationServiceFactory().create()).resolves.toBeInstanceOf(InMemoryNotificationService);
    },
  );

  it.each(['aws-sns', 'AWS-SNS'])(
    'builds the SNS push notification service for NOTIFICATION_DRIVER=%s',
    async (driver) => {
      process.env.NOTIFICATION_DRIVER = driver;
      process.env.NOTIFICATION_SNS_REGION = 'eu-west-1';

      const service = await new NotificationServiceFactory().create();

      expect(service).toBeInstanceOf(SNSPushNotificationService);
      expect(service.circuitBreakerStatuses?.()).toEqual([
        { name: 'aws_sns', state: 'closed', failureCount: 0, failureThreshold: 5 },
      ]);
      await service.shutdown?.();
    },
  );

  it('fails to build the SNS push notification service without an AWS region', async () => {
    process.env.NOTIFICATION_DRIVER = 'aws-sns';

    await expect(new NotificationServiceFactory().create()).rejects.toBeInstanceOf(DriverError);
  });

  it('fails to build the SNS push notification service with an invalid circuit breaker setting', async () => {
    process.env.NOTIFICATION_DRIVER = 'aws-sns';
    process.env.NOTIFICATION_SNS_REGION = 'eu-west-1';
    process.env.NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD = '-1';

    await expect(new NotificationServiceFactory().create()).rejects.toBeInstanceOf(RangeError);
  });

  it.each(['sns', 'fcm'])('rejects NOTIFICATION_DRIVER=%s', async (driver) => {
    process.env.NOTIFICATION_DRIVER = driver;

    const thrown = await new NotificationServiceFactory().create().catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'DRIVER_ERROR', data: { notificationType: driver } });
  });
});
