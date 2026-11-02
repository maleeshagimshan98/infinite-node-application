/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as path from 'path';

import { GetAccountCommand } from '@aws-sdk/client-sesv2';

import { DriverError } from '@/infrastructure/core/errors/driver.error';

import { sesConfig } from './ses.config';
import { SESDriver } from './ses.driver';

import type { ISESConfig } from './ses.config';
import type { GetAccountCommandOutput } from '@aws-sdk/client-sesv2';

const SES_ENV = [
  'EMAIL_FROM',
  'EMAIL_SES_REGION',
  'EMAIL_SES_CONNECTION_TIMEOUT',
  'EMAIL_SES_REQUEST_TIMEOUT',
  'EMAIL_CIRCUIT_FAILURE_THRESHOLD',
  'EMAIL_CIRCUIT_RESET_TIMEOUT',
  'EMAIL_SERVICE_OPTIONAL',
  'AWS_REGION',
  'AWS_PROFILE',
];

/**
 * Build a driver config for the given region.
 *
 * @param {string | undefined} region - The configured SES region.
 * @returns {ISESConfig} The config.
 */
function driverConfig(region: string | undefined): ISESConfig {
  return {
    driverName: 'email',
    singleton: true,
    deferred: true,
    region,
    from: 'noreply@example.com',
    connectionTimeout: 1000,
    requestTimeout: 1000,
    circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
    queue: { name: 'test-email-queue', attempts: 3, retryDelay: 1000, backoff: 'exponential' },
  };
}

describe('SES driver', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of SES_ENV) {
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

  describe('sesConfig', () => {
    it('defaults the timeouts and circuit breaker, leaving the region to the AWS SDK', () => {
      process.env.EMAIL_FROM = 'noreply@example.com';

      expect(sesConfig()).toMatchObject({
        region: undefined,
        from: 'noreply@example.com',
        connectionTimeout: 5000,
        requestTimeout: 10000,
        circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
        optional: false,
      });
    });

    it('reads every setting from the environment', () => {
      process.env.EMAIL_FROM = 'noreply@example.com';
      process.env.EMAIL_SES_REGION = 'eu-west-1';
      process.env.EMAIL_SES_CONNECTION_TIMEOUT = '2000';
      process.env.EMAIL_SES_REQUEST_TIMEOUT = '4000';
      process.env.EMAIL_CIRCUIT_FAILURE_THRESHOLD = '0';
      process.env.EMAIL_CIRCUIT_RESET_TIMEOUT = '60000';
      process.env.EMAIL_SERVICE_OPTIONAL = 'true';

      expect(sesConfig()).toMatchObject({
        region: 'eu-west-1',
        connectionTimeout: 2000,
        requestTimeout: 4000,
        circuitBreaker: { failureThreshold: 0, resetTimeout: 60000 },
        optional: true,
      });
    });

    it('requires EMAIL_FROM', () => {
      expect(() => sesConfig()).toThrow(RangeError);
    });
  });

  describe('init', () => {
    it('uses the configured region', async () => {
      const driver = new SESDriver(driverConfig('eu-west-1'));

      await driver.init();

      await expect(driver.client()?.config.region()).resolves.toBe('eu-west-1');
    });

    it("falls back to the AWS SDK's region, such as AWS_REGION", async () => {
      process.env.AWS_REGION = 'ap-southeast-2';
      const driver = new SESDriver(driverConfig(undefined));

      await driver.init();

      await expect(driver.client()?.config.region()).resolves.toBe('ap-southeast-2');
    });

    it('fails when no region is configured anywhere', async () => {
      const driver = new SESDriver(driverConfig(undefined));

      await expect(driver.init()).rejects.toBeInstanceOf(DriverError);
      expect(driver.client()).toBeUndefined();
    });

    it('drops the client on shutdown', async () => {
      const driver = new SESDriver(driverConfig('eu-west-1'));
      await driver.init();

      await driver.shutdown();

      expect(driver.client()).toBeUndefined();
    });
  });

  describe('health', () => {
    it('reports a driver that is not initialized as disconnected', async () => {
      const driver = new SESDriver(driverConfig('eu-west-1'));

      await expect(driver.health()).resolves.toEqual({ connected: false, error: 'SES client not initialized' });
    });

    it('reports connected with a latency when SES answers GetAccount, aborting a slow check', async () => {
      const driver = new SESDriver(driverConfig('eu-west-1'));
      await driver.init();
      const client = driver.client();
      if (!client) {
        throw new Error('The driver did not build a client');
      }
      const send = jest
        .spyOn(client, 'send')
        .mockImplementation((): Promise<GetAccountCommandOutput> => Promise.resolve({ $metadata: {} }));

      const health = await driver.health();

      expect(health).toEqual({ connected: true, latency: expect.any(Number) });
      expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetAccountCommand);
      expect(send.mock.calls[0]?.[1]).toEqual({ abortSignal: expect.any(AbortSignal) });
    });

    it('reports disconnected with the reason when SES cannot be reached', async () => {
      const driver = new SESDriver(driverConfig('eu-west-1'));
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
