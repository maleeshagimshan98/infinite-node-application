/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { emailQueueConfig } from './email-queue.config';

const QUEUE_ENV = [
  'APP_NAME',
  'EMAIL_QUEUE_NAME',
  'EMAIL_QUEUE_ATTEMPTS',
  'EMAIL_QUEUE_RETRY_DELAY',
  'EMAIL_QUEUE_BACKOFF',
];

describe('emailQueueConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of QUEUE_ENV) {
      delete process.env[name];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("defaults to five exponential attempts on the app's email queue", () => {
    process.env.APP_NAME = 'my-app';

    expect(emailQueueConfig()).toEqual({
      name: 'my-app-email-queue',
      attempts: 5,
      retryDelay: 10000,
      backoff: 'exponential',
    });
  });

  it('names the queue after infinite-node-application when APP_NAME is unset', () => {
    expect(emailQueueConfig().name).toBe('infinite-node-application-email-queue');
  });

  it('reads every setting from the environment', () => {
    process.env.EMAIL_QUEUE_NAME = 'emails';
    process.env.EMAIL_QUEUE_ATTEMPTS = '1';
    process.env.EMAIL_QUEUE_RETRY_DELAY = '0';
    process.env.EMAIL_QUEUE_BACKOFF = 'fixed';

    expect(emailQueueConfig()).toEqual({ name: 'emails', attempts: 1, retryDelay: 0, backoff: 'fixed' });
  });

  it.each([
    ['EMAIL_QUEUE_ATTEMPTS', '0'],
    ['EMAIL_QUEUE_ATTEMPTS', '2.5'],
    ['EMAIL_QUEUE_ATTEMPTS', 'three'],
    ['EMAIL_QUEUE_RETRY_DELAY', '-1'],
    ['EMAIL_QUEUE_RETRY_DELAY', 'soon'],
    ['EMAIL_QUEUE_BACKOFF', 'linear'],
  ])('throws a RangeError for %s=%s', (name, value) => {
    process.env[name] = value;

    expect(() => emailQueueConfig()).toThrow(RangeError);
  });
});
