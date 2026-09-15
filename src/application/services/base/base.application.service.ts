/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IDatabaseMapper, TransactionOptions } from '@/application/interfaces';

export class BaseApplicationService {
  private databaseMapperService: IDatabaseMapper;
  constructor(databaseMapperService: IDatabaseMapper) {
    this.databaseMapperService = databaseMapperService;
  }

  /**
   * Executes a series of database operations within a transaction, if supported by the underlying mapper
   *
   * @param {(options: TransactionOptions) => Promise<T>} callback - The operations to run inside the transaction; receives the active TransactionOptions.
   * @returns {Promise<T>} The value returned by `callback`.
   */
  async dbTransaction<T>(callback: (options: TransactionOptions) => Promise<T>): Promise<T> {
    return await this.databaseMapperService.transaction(({ session }) => {
      return callback({ session });
    });
  }
}

export default BaseApplicationService;
