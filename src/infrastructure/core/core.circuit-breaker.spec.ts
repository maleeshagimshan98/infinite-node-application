/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import type { ICircuitBreakerOptions } from '@/infrastructure/core/interfaces/circuit-breaker.interface';

import { CircuitBreaker } from './core.circuit-breaker';

const THRESHOLD = 2;
const RESET_TIMEOUT = 1000;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/**
 * Create a promise settled by hand, to keep a call in flight while the circuit changes state.
 *
 * @template T
 * @returns {Deferred<T>} The promise and its settle functions.
 */
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Create a breaker with the test defaults.
 *
 * @param {Partial<ICircuitBreakerOptions>} overrides - Options to change.
 * @returns {CircuitBreaker} The breaker.
 */
function createBreaker(overrides: Partial<ICircuitBreakerOptions> = {}): CircuitBreaker {
  return new CircuitBreaker({ name: 'test', failureThreshold: THRESHOLD, resetTimeout: RESET_TIMEOUT, ...overrides });
}

/**
 * Build a call that rejects with the given error.
 *
 * @param {unknown} error - The error to reject with; an InfrastructureError by default.
 * @returns {() => Promise<never>} The call.
 */
function failingCall(
  error: unknown = new InfrastructureError('dependency down', 'NETWORK_ERROR'),
): () => Promise<never> {
  return (): Promise<never> => Promise.reject(error);
}

/**
 * Build a call that resolves with 'ok'.
 *
 * @returns {jest.Mock<Promise<string>, []>} The call, as a mock so tests can check whether it ran.
 */
function okCall(): jest.Mock<Promise<string>, []> {
  return jest.fn((): Promise<string> => Promise.resolve('ok'));
}

/**
 * Fail calls until the circuit opens.
 *
 * @param {CircuitBreaker} breaker - The breaker to trip.
 * @returns {Promise<void>}
 */
async function trip(breaker: CircuitBreaker): Promise<void> {
  for (let i = 0; i <= THRESHOLD; i++) {
    await breaker.execute(failingCall()).catch(() => undefined);
  }
}

/**
 * Trip the circuit and wait out the cool-down.
 *
 * @param {CircuitBreaker} breaker - The breaker to move to half-open.
 * @returns {Promise<void>}
 */
async function toHalfOpen(breaker: CircuitBreaker): Promise<void> {
  await trip(breaker);
  jest.advanceTimersByTime(RESET_TIMEOUT);
}

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it.each([
      ['a negative failureThreshold', { failureThreshold: -1 }],
      ['a fractional failureThreshold', { failureThreshold: 1.5 }],
      ['a NaN failureThreshold', { failureThreshold: Number.NaN }],
      ['a zero resetTimeout', { resetTimeout: 0 }],
      ['a negative resetTimeout', { resetTimeout: -1 }],
      ['an infinite resetTimeout', { resetTimeout: Number.POSITIVE_INFINITY }],
    ])('rejects %s', (_label, overrides) => {
      expect(() => createBreaker(overrides)).toThrow(RangeError);
    });

    it('starts closed with no failures', () => {
      const breaker = createBreaker();

      expect(breaker.state).toBe('closed');
      expect(breaker.failureCount).toBe(0);
    });
  });

  describe('closed', () => {
    it('counts an infrastructure failure and rejects with the original error', async () => {
      const breaker = createBreaker();
      const error = new InfrastructureError('dependency down', 'NETWORK_ERROR');

      await expect(breaker.execute(failingCall(error))).rejects.toBe(error);

      expect(breaker.failureCount).toBe(1);
      expect(breaker.state).toBe('closed');
    });

    it('stays closed while the failure count is at the threshold', async () => {
      const breaker = createBreaker();

      for (let i = 0; i < THRESHOLD; i++) {
        await breaker.execute(failingCall()).catch(() => undefined);
      }

      expect(breaker.failureCount).toBe(THRESHOLD);
      expect(breaker.state).toBe('closed');
    });

    it('opens once the failure count exceeds the threshold, and the tripping call rejects with its own error', async () => {
      const breaker = createBreaker();
      for (let i = 0; i < THRESHOLD; i++) {
        await breaker.execute(failingCall()).catch(() => undefined);
      }
      const error = new InfrastructureError('dependency down', 'NETWORK_ERROR');

      await expect(breaker.execute(failingCall(error))).rejects.toBe(error);

      expect(breaker.state).toBe('open');
    });

    it('opens on the first failure when the threshold is 0', async () => {
      const breaker = createBreaker({ failureThreshold: 0 });

      await breaker.execute(failingCall()).catch(() => undefined);

      expect(breaker.state).toBe('open');
    });

    it('returns the result and lowers the failure count on success, never below 0', async () => {
      const breaker = createBreaker();
      await breaker.execute(failingCall()).catch(() => undefined);

      await expect(breaker.execute(okCall())).resolves.toBe('ok');
      expect(breaker.failureCount).toBe(0);

      await breaker.execute(okCall());
      expect(breaker.failureCount).toBe(0);
      expect(breaker.state).toBe('closed');
    });

    it('rethrows an uncounted error without changing the failure count or the state', async () => {
      const breaker = createBreaker();
      await breaker.execute(failingCall()).catch(() => undefined);
      const error = new TypeError('caller bug');

      await expect(breaker.execute(failingCall(error))).rejects.toBe(error);

      expect(breaker.failureCount).toBe(1);
      expect(breaker.state).toBe('closed');
    });

    it('counts only the errors isFailure accepts', async () => {
      const breaker = createBreaker({ isFailure: (error: unknown): boolean => error instanceof TypeError });

      await breaker.execute(failingCall()).catch(() => undefined);
      expect(breaker.failureCount).toBe(0);

      await breaker.execute(failingCall(new TypeError('counted'))).catch(() => undefined);
      expect(breaker.failureCount).toBe(1);
    });
  });

  describe('isFailureResult', () => {
    const flagged = (): boolean => true;

    it('counts a flagged result as a failure and still returns it to the caller', async () => {
      const breaker = createBreaker();

      await expect(breaker.execute(okCall(), flagged)).resolves.toBe('ok');

      expect(breaker.failureCount).toBe(1);
    });

    it('opens once flagged results exceed the threshold', async () => {
      const breaker = createBreaker();

      for (let i = 0; i <= THRESHOLD; i++) {
        await breaker.execute(okCall(), flagged);
      }

      expect(breaker.state).toBe('open');
    });

    it('treats an unflagged result as a success', async () => {
      const breaker = createBreaker();
      await breaker.execute(failingCall()).catch(() => undefined);

      await breaker.execute(okCall(), (): boolean => false);

      expect(breaker.failureCount).toBe(0);
    });

    it('reopens when the test request returns a flagged result', async () => {
      const breaker = createBreaker();
      await toHalfOpen(breaker);

      await expect(breaker.execute(okCall(), flagged)).resolves.toBe('ok');

      expect(breaker.state).toBe('open');
    });
  });

  describe('open', () => {
    it('rejects with CircuitOpenError without running the call', async () => {
      const breaker = createBreaker();
      await trip(breaker);
      const call = okCall();

      await expect(breaker.execute(call)).rejects.toBeInstanceOf(CircuitOpenError);

      expect(call).not.toHaveBeenCalled();
      expect(breaker.state).toBe('open');
    });

    it('rejects with a CONNECTION_ERROR naming the breaker, so it reaches the client as a 503', async () => {
      const breaker = createBreaker();
      await trip(breaker);

      const thrown = await breaker.execute(okCall()).catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(InfrastructureError);
      expect(thrown).toMatchObject({ type: 'CONNECTION_ERROR', data: { breaker: 'test', state: 'open' } });
    });

    it('does not count the rejected calls', async () => {
      const breaker = createBreaker();
      await trip(breaker);
      const countWhenOpened = breaker.failureCount;

      await breaker.execute(failingCall()).catch(() => undefined);

      expect(breaker.failureCount).toBe(countWhenOpened);
    });

    it('moves to half-open once resetTimeout has passed', async () => {
      const breaker = createBreaker();
      await trip(breaker);

      jest.advanceTimersByTime(RESET_TIMEOUT - 1);
      expect(breaker.state).toBe('open');

      jest.advanceTimersByTime(1);
      expect(breaker.state).toBe('half-open');
    });

    it('measures the cool-down from when it opened, not from later rejected calls', async () => {
      const breaker = createBreaker();
      await trip(breaker);

      jest.advanceTimersByTime(RESET_TIMEOUT / 2);
      await breaker.execute(okCall()).catch(() => undefined);
      jest.advanceTimersByTime(RESET_TIMEOUT / 2);

      expect(breaker.state).toBe('half-open');
    });
  });

  describe('half-open', () => {
    it('lets one test request through and rejects calls that overlap it', async () => {
      const breaker = createBreaker();
      await toHalfOpen(breaker);
      const pending = deferred<string>();

      const probe = breaker.execute(() => pending.promise);
      const overlapping = okCall();
      await expect(breaker.execute(overlapping)).rejects.toMatchObject({ data: { state: 'half-open' } });
      expect(overlapping).not.toHaveBeenCalled();

      pending.resolve('ok');
      await expect(probe).resolves.toBe('ok');
    });

    it('closes and clears the failure count when the test request succeeds', async () => {
      const breaker = createBreaker();
      await toHalfOpen(breaker);

      await expect(breaker.execute(okCall())).resolves.toBe('ok');

      expect(breaker.state).toBe('closed');
      expect(breaker.failureCount).toBe(0);
    });

    it('reopens for another full cool-down when the test request fails', async () => {
      const breaker = createBreaker();
      await toHalfOpen(breaker);
      const error = new InfrastructureError('still down', 'NETWORK_ERROR');

      await expect(breaker.execute(failingCall(error))).rejects.toBe(error);
      expect(breaker.state).toBe('open');

      jest.advanceTimersByTime(RESET_TIMEOUT - 1);
      expect(breaker.state).toBe('open');
      jest.advanceTimersByTime(1);
      expect(breaker.state).toBe('half-open');
    });

    it('stays half-open after an uncounted error, and the next call becomes the test request', async () => {
      const breaker = createBreaker();
      await toHalfOpen(breaker);
      const error = new TypeError('caller bug');

      await expect(breaker.execute(failingCall(error))).rejects.toBe(error);
      expect(breaker.state).toBe('half-open');

      await expect(breaker.execute(okCall())).resolves.toBe('ok');
      expect(breaker.state).toBe('closed');
    });
  });

  describe('overlapping calls', () => {
    it('ignores a slow success that settles after the circuit opened', async () => {
      const breaker = createBreaker();
      const slow = deferred<string>();
      const slowCall = breaker.execute(() => slow.promise);
      await trip(breaker);
      const countWhenOpened = breaker.failureCount;

      slow.resolve('ok');
      await expect(slowCall).resolves.toBe('ok');

      expect(breaker.state).toBe('open');
      expect(breaker.failureCount).toBe(countWhenOpened);
    });

    it('ignores a slow failure that settles after the circuit opened', async () => {
      const breaker = createBreaker();
      const slow = deferred<string>();
      const slowCall = breaker.execute(() => slow.promise);
      await trip(breaker);
      const countWhenOpened = breaker.failureCount;
      const error = new InfrastructureError('late failure', 'NETWORK_ERROR');

      slow.reject(error);
      await expect(slowCall).rejects.toBe(error);

      expect(breaker.state).toBe('open');
      expect(breaker.failureCount).toBe(countWhenOpened);
    });

    it('does not treat a slow call that settles in half-open as the test request', async () => {
      const breaker = createBreaker();
      const slow = deferred<string>();
      const slowCall = breaker.execute(() => slow.promise);
      await toHalfOpen(breaker);

      slow.resolve('ok');
      await slowCall;

      expect(breaker.state).toBe('half-open');
    });
  });

  describe('reset', () => {
    it('closes the circuit, clears the failure count and cancels the pending cool-down', async () => {
      const breaker = createBreaker();
      await trip(breaker);

      breaker.reset();
      expect(breaker.state).toBe('closed');
      expect(breaker.failureCount).toBe(0);

      // A cool-down left pending would move the closed circuit to half-open when it fired.
      jest.advanceTimersByTime(RESET_TIMEOUT);
      expect(breaker.state).toBe('closed');
    });

    it('restarts the cool-down when the circuit reopens after a reset', async () => {
      const breaker = createBreaker();
      await trip(breaker);
      jest.advanceTimersByTime(RESET_TIMEOUT / 2);
      breaker.reset();

      // Reopen halfway through the first cool-down: the half-open move must come a full cool-down later.
      await trip(breaker);
      jest.advanceTimersByTime(RESET_TIMEOUT / 2);
      expect(breaker.state).toBe('open');

      jest.advanceTimersByTime(RESET_TIMEOUT / 2);
      expect(breaker.state).toBe('half-open');
    });
  });
});
