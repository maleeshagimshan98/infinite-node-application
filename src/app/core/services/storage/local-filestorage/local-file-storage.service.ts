import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../../core.service';
import type { IFileSystemStorageConfig } from '../../../config/service/local-file-storage.config';
import { InfiniteNodeError } from '../../../../errors/InfiniteNodeError';
import { LocalFileStorageClient } from './local-file-storage-client';

export class LocalFileStorageService implements ICoreService<IFileSystemStorageConfig> {
  private client: LocalFileStorageClient | undefined;

  constructor() {}

  async init(_container: AwilixContainer, config: IFileSystemStorageConfig): Promise<void> {
    try {
      const client = new LocalFileStorageClient(config.params.rootPath);
      await client.ensureReady();
      this.client = client;
    } catch (err: unknown) {
      throw new InfiniteNodeError(
        `Failed to initialize StorageService: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  service(): LocalFileStorageClient | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    //... No persistent handles to close for filesystem wrapper
  }
}
