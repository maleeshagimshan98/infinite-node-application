/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../../../service.container';
import type { IMySQLConfig } from '../../../config/drivers/mysql.config';
import { MySQLDriver } from './mysql.driver';
import type { Pool } from 'mysql';

export const mysqlDriverLoader = async (container: AwilixContainer, config: IMySQLConfig): Promise<MySQLDriver> => {
  try {
    const mysqlDriver = new MySQLDriver();
    await mysqlDriver.init(container, config);
    const client: Pool | undefined = mysqlDriver.driver();
    if (!client || typeof (client as Pool).getConnection !== 'function') {
      throw new InfiniteNodeError('MySQL client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return mysqlDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load MySQLDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
