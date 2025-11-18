/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../../errors/InfiniteNodeError';
import { registerService } from '../../service.container';
import type { IMySQLConfig } from '../../../config/service/mysql.config';
import { MySQLService } from './mysql.service';
import type { Pool } from 'mysql';

export const mysqlServiceLoader = async (container: AwilixContainer, config: IMySQLConfig): Promise<MySQLService> => {
  try {
    const mysqlService = new MySQLService();
    await mysqlService.init(container, config);
    const client: Pool | undefined = mysqlService.service();
    if (!client || typeof (client as Pool).getConnection !== 'function') {
      throw new InfiniteNodeError('MySQL client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return mysqlService;
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load MySQLService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
