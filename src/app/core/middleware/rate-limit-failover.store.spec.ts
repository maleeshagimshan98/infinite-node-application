/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { RateLimitFailoverStore } from './rate-limit-failover.store';

import type { IncrementResponse, Options, Store } from 'express-rate-limit';

describe('RateLimitFailoverStore', () => {
  let primaryStore: jest.Mocked<Store>;
  let fallbackStore: jest.Mocked<Store>;
  let logger: jest.Mocked<ILogger>;
  let store: RateLimitFailoverStore;

  const primaryResult: IncrementResponse = { totalHits: 1, resetTime: new Date() };
  const fallbackResult: IncrementResponse = { totalHits: 1, resetTime: new Date() };

  beforeEach(() => {
    primaryStore = {
      init: jest.fn(),
      increment: jest.fn().mockResolvedValue(primaryResult),
      decrement: jest.fn().mockResolvedValue(undefined),
      resetKey: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Store>;

    fallbackStore = {
      init: jest.fn(),
      increment: jest.fn().mockResolvedValue(fallbackResult),
      decrement: jest.fn().mockResolvedValue(undefined),
      resetKey: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Store>;

    logger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
      logWarn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    store = new RateLimitFailoverStore(primaryStore, fallbackStore, logger);
  });

  describe('Redis up', () => {
    it('returns the primary store result and never touches the fallback or warns', async () => {
      const result = await store.increment('client-1');

      expect(result).toBe(primaryResult);
      expect(fallbackStore.increment).not.toHaveBeenCalled();
      expect(logger.logWarn).not.toHaveBeenCalled();
    });
  });

  describe('Redis down', () => {
    it('falls back to the in-memory store result and logs a warning', async () => {
      primaryStore.increment.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await store.increment('client-1');

      expect(result).toBe(fallbackResult);
      expect(logger.logWarn).toHaveBeenCalledTimes(1);
      expect(logger.logWarn).toHaveBeenCalledWith(expect.stringContaining('falling back to in-memory store'), {
        error: 'ECONNREFUSED',
      });
    });

    it('only warns once while the primary keeps failing across repeated calls', async () => {
      primaryStore.increment.mockRejectedValue(new Error('ECONNREFUSED'));

      await store.increment('client-1');
      await store.increment('client-1');
      await store.increment('client-1');

      expect(fallbackStore.increment).toHaveBeenCalledTimes(3);
      expect(logger.logWarn).toHaveBeenCalledTimes(1);
    });

    it('propagates the error if the fallback store also fails', async () => {
      primaryStore.increment.mockRejectedValue(new Error('primary down'));
      fallbackStore.increment.mockRejectedValue(new Error('fallback down'));

      await expect(store.increment('client-1')).rejects.toThrow('fallback down');
      expect(logger.logWarn).toHaveBeenCalledTimes(1);
    });
  });

  describe('recovery', () => {
    it('logs a recovery message once the primary succeeds again, then warns again on a later failure', async () => {
      primaryStore.increment.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await store.increment('client-1');
      expect(logger.logWarn).toHaveBeenCalledTimes(1);

      await store.increment('client-1');
      expect(logger.logInfo).toHaveBeenCalledTimes(1);
      expect(logger.logInfo).toHaveBeenCalledWith(expect.stringContaining('recovered'));

      primaryStore.increment.mockRejectedValueOnce(new Error('ECONNREFUSED again'));
      await store.increment('client-1');
      expect(logger.logWarn).toHaveBeenCalledTimes(2);
    });
  });

  describe('decrement and resetKey', () => {
    it('decrement uses the primary store when healthy and the fallback store on failure', async () => {
      await store.decrement('client-1');
      expect(primaryStore.decrement).toHaveBeenCalledWith('client-1');
      expect(fallbackStore.decrement).not.toHaveBeenCalled();

      primaryStore.decrement.mockRejectedValue(new Error('down'));
      await store.decrement('client-1');
      expect(fallbackStore.decrement).toHaveBeenCalledWith('client-1');
    });

    it('resetKey uses the primary store when healthy and the fallback store on failure', async () => {
      await store.resetKey('client-1');
      expect(primaryStore.resetKey).toHaveBeenCalledWith('client-1');
      expect(fallbackStore.resetKey).not.toHaveBeenCalled();

      primaryStore.resetKey.mockRejectedValue(new Error('down'));
      await store.resetKey('client-1');
      expect(fallbackStore.resetKey).toHaveBeenCalledWith('client-1');
    });
  });

  describe('init', () => {
    it('propagates options to both the primary and fallback stores', () => {
      const options = { windowMs: 1000 } as Options;

      store.init(options);

      expect(primaryStore.init).toHaveBeenCalledWith(options);
      expect(fallbackStore.init).toHaveBeenCalledWith(options);
    });

    it('does not throw when a store omits init entirely', () => {
      const primaryWithoutInit = { ...primaryStore, init: undefined } as unknown as Store;
      const storeWithoutInit = new RateLimitFailoverStore(primaryWithoutInit, fallbackStore, logger);

      expect(() => storeWithoutInit.init({ windowMs: 1000 } as Options)).not.toThrow();
    });
  });
});
