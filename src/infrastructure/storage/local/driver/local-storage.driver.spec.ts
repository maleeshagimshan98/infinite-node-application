/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { DriverError } from '@/infrastructure/core/errors/driver.error';

import { LocalStorageDriver } from './local-storage.driver';

import type { IFileSystemStorageConfig } from './local-file-storage.config';

/**
 * Build a local storage driver config rooted at the given folder.
 *
 * @param {string} rootPath - The storage root folder.
 * @returns {IFileSystemStorageConfig} The config.
 */
function configFor(rootPath: string): IFileSystemStorageConfig {
  return { driverName: 'storage', singleton: true, deferred: false, params: { rootPath } };
}

describe('LocalStorageDriver', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'local-storage-driver-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('creates a missing root folder on init and exposes it as its client', async () => {
    const root = path.join(tmp, 'nested', 'storage');
    const driver = new LocalStorageDriver(configFor(root));

    await driver.init();

    expect((await fs.stat(root)).isDirectory()).toBe(true);
    expect(driver.client()).toBe(root);
  });

  it('throws DriverError on init when the root path is a file', async () => {
    const file = path.join(tmp, 'not-a-folder');
    await fs.writeFile(file, 'x');
    const driver = new LocalStorageDriver(configFor(file));

    await expect(driver.init()).rejects.toBeInstanceOf(DriverError);
    expect(driver.client()).toBeUndefined();
  });

  it('reports connected, with a latency, while the root folder is usable', async () => {
    const driver = new LocalStorageDriver(configFor(tmp));
    await driver.init();

    const health = await driver.health();

    expect(health.connected).toBe(true);
    expect(typeof health.latency).toBe('number');
  });

  it('reports disconnected once the root folder is gone, without throwing', async () => {
    const root = path.join(tmp, 'storage');
    const driver = new LocalStorageDriver(configFor(root));
    await driver.init();
    await fs.rm(root, { recursive: true, force: true });

    const health = await driver.health();

    expect(health.connected).toBe(false);
    expect(health.error).toEqual(expect.any(String));
  });

  it('reports disconnected before init and after shutdown', async () => {
    const driver = new LocalStorageDriver(configFor(tmp));
    await expect(driver.health()).resolves.toEqual({ connected: false, error: 'Local storage not initialized' });

    await driver.init();
    await driver.shutdown();

    await expect(driver.health()).resolves.toEqual({ connected: false, error: 'Local storage not initialized' });
  });
});
