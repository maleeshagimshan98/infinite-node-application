/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { promises as fs, constants as fsConstants } from 'fs';
import { join } from 'path';

export class LocalFileStorageClient {
  private readonly root: string;
  constructor(rootPath: string) {
    this.root = rootPath;
  }

  getRoot(): string {
    return this.root;
  }

  async ensureReady(): Promise<void> {
    try {
      await fs.access(this.root, fsConstants.R_OK | fsConstants.W_OK);
    } catch {
      await fs.mkdir(this.root, { recursive: true });
    }

    const probe = `.__probe_${Date.now()}`;
    await this.write(probe, 'ok');
    await this.delete(probe);
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(join(this.root, relativePath));
  }

  async write(relativePath: string, data: Buffer | string): Promise<void> {
    await fs.writeFile(join(this.root, relativePath), data);
  }

  async delete(relativePath: string): Promise<void> {
    await fs.rm(join(this.root, relativePath), { force: true });
  }
}
