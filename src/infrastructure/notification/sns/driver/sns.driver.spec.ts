/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as path from 'path';

import { ListTopicsCommand } from '@aws-sdk/client-sns';

import { DriverError } from '@/infrastructure/core/errors/driver.error';

import { snsConfig } from './sns.config';
import { SNSDriver } from './sns.driver';

import type { ISNSConfig } from './sns.config';
import type { ListTopicsCommandOutput } from '@aws-sdk/client-sns';

const SNS_ENV = [
  'NOTIFICATION_SNS_REGION',
  'NOTIFICATION_SNS_BROADCAST_TOPIC_ARN',
  'NOTIFICATION_SNS_CONNECTION_TIMEOUT',
  'NOTIFICATION_SNS_REQUEST_TIMEOUT',
  'NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD',
  'NOTIFICATION_CIRCUIT_RESET_TIMEOUT',
  'NOTIFICATION_SERVICE_OPTIONAL',
  'AWS_REGION',
  'AWS_PROFILE',
];

/**
 * Build a driver config for the given region.
 *
 * @param {string | undefined} region - The configured SNS region.
 * @returns {ISNSConfig} The config.
 */
function driverConfig(region: string | undefined): ISNSConfig {
  return {
    driverName: 'notification',
    singleton: true,
    deferred: false,
    region,
    broadcastTopicArn: undefined,
    connectionTimeout: 1000,
    requestTimeout: 1000,
    circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
  };
}

describe('SNS driver', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of SNS_ENV) {
      delete process.env[name];
    }
    // Keep the developer's own ~/.aws/config from supplying a region.
    const missing = path.join(__dirname, 'no-such-aws-file');
    process.env.AWS_CONFIG_FILE = missing;
    process.env.AWS_SHARED_CREDENTIALS_FILE = missing;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('snsConfig', () => {
    it('defaults the timeouts and circuit breaker, leaving the region to the AWS SDK and broadcasts off', () => {
      expect(snsConfig()).toMatchObject({
        region: undefined,
        broadcastTopicArn: undefined,
        connectionTimeout: 5000,
        requestTimeout: 10000,
        circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
        optional: false,
      });
    });

    it('reads every setting from the environment', () => {
      process.env.NOTIFICATION_SNS_REGION = 'eu-west-1';
      process.env.NOTIFICATION_SNS_BROADCAST_TOPIC_ARN = 'arn:aws:sns:eu-west-1:123456789012:broadcast';
      process.env.NOTIFICATION_SNS_CONNECTION_TIMEOUT = '2000';
      process.env.NOTIFICATION_SNS_REQUEST_TIMEOUT = '4000';
      process.env.NOTIFICATION_CIRCUIT_FAILURE_THRESHOLD = '0';
      process.env.NOTIFICATION_CIRCUIT_RESET_TIMEOUT = '60000';
      process.env.NOTIFICATION_SERVICE_OPTIONAL = 'true';

      expect(snsConfig()).toMatchObject({
        region: 'eu-west-1',
        broadcastTopicArn: 'arn:aws:sns:eu-west-1:123456789012:broadcast',
        connectionTimeout: 2000,
        requestTimeout: 4000,
        circuitBreaker: { failureThreshold: 0, resetTimeout: 60000 },
        optional: true,
      });
    });
  });

  describe('init', () => {
    it('uses the configured region', async () => {
      const driver = new SNSDriver(driverConfig('eu-west-1'));

      await driver.init();

      await expect(driver.client()?.config.region()).resolves.toBe('eu-west-1');
    });

    it("falls back to the AWS SDK's region, such as AWS_REGION", async () => {
      process.env.AWS_REGION = 'ap-southeast-2';
      const driver = new SNSDriver(driverConfig(undefined));

      await driver.init();

      await expect(driver.client()?.config.region()).resolves.toBe('ap-southeast-2');
    });

    it('fails when no region is configured anywhere', async () => {
      const driver = new SNSDriver(driverConfig(undefined));

      await expect(driver.init()).rejects.toBeInstanceOf(DriverError);
      expect(driver.client()).toBeUndefined();
    });

    it('drops the client on shutdown', async () => {
      const driver = new SNSDriver(driverConfig('eu-west-1'));
      await driver.init();

      await driver.shutdown();

      expect(driver.client()).toBeUndefined();
    });
  });

  describe('health', () => {
    it('reports a driver that is not initialized as disconnected', async () => {
      const driver = new SNSDriver(driverConfig('eu-west-1'));

      await expect(driver.health()).resolves.toEqual({ connected: false, error: 'SNS client not initialized' });
    });

    it('reports connected with a latency when SNS answers ListTopics, aborting a slow check', async () => {
      const driver = new SNSDriver(driverConfig('eu-west-1'));
      await driver.init();
      const client = driver.client();
      if (!client) {
        throw new Error('The driver did not build a client');
      }
      const send = jest
        .spyOn(client, 'send')
        .mockImplementation((): Promise<ListTopicsCommandOutput> => Promise.resolve({ $metadata: {} }));

      const health = await driver.health();

      expect(health).toEqual({ connected: true, latency: expect.any(Number) });
      expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListTopicsCommand);
      expect(send.mock.calls[0]?.[1]).toEqual({ abortSignal: expect.any(AbortSignal) });
    });

    it('reports disconnected with the reason when SNS cannot be reached', async () => {
      const driver = new SNSDriver(driverConfig('eu-west-1'));
      await driver.init();
      const client = driver.client();
      if (!client) {
        throw new Error('The driver did not build a client');
      }
      jest
        .spyOn(client, 'send')
        .mockImplementation((): Promise<never> => Promise.reject(new Error('connect ETIMEDOUT')));

      await expect(driver.health()).resolves.toEqual({ connected: false, error: 'connect ETIMEDOUT' });
    });
  });
});
