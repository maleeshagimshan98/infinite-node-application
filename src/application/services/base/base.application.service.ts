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
   * @param {(options: TransactionOptions) => Promise<unknown>} callback
   * @returns {Promise<unknown>}
   */
  async dbTransaction(callback: (options: TransactionOptions) => Promise<unknown>): Promise<unknown> {
    return await this.databaseMapperService.transaction(({ session }) => {
      return callback({ session });
    });
  }
}

export default BaseApplicationService;
