/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService not-found handling', () => {
  const originalRoot = process.env.STORAGE_ROOT_PATH;
  let root: string;
  let service: LocalStorageService;

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-storage-spec-'));
    process.env.STORAGE_ROOT_PATH = root;
    service = new LocalStorageService();
  });

  afterAll(async () => {
    process.env.STORAGE_ROOT_PATH = originalRoot;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('returns null when the file does not exist', async () => {
    await expect(service.readFile('missing.txt')).resolves.toBeNull();
  });

  it('returns [] when the folder does not exist', async () => {
    await expect(service.listFiles('missing-folder')).resolves.toEqual([]);
  });

  it('still reports other file system failures as STORAGE_ERROR with data.cause', async () => {
    await service.createFolder('a-folder');

    const thrown = await service.readFile('a-folder').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({
      type: 'STORAGE_ERROR',
      data: { filePath: 'a-folder', cause: expect.objectContaining({ code: 'EISDIR' }) },
    });
  });
});
