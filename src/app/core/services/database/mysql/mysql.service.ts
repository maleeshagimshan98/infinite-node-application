/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../../core.service';
import type { IMySQLConfig } from '../../../config/service/mysql.config';
import type { Pool } from 'mysql';
import { createPool } from 'mysql';

export class MySQLService implements ICoreService<IMySQLConfig> {
  private pool: Pool | undefined;

  constructor() {}

  async init(container: AwilixContainer, config: IMySQLConfig): Promise<void> {
    const { host, port, user, password, database } = config.params;
    const pool = createPool({
      host,
      port: Number(port) || 3306,
      user,
      password,
      database,
      connectionLimit: 10,
    });

    // Verify connectivity by acquiring and releasing a connection once
    await new Promise<void>((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) return reject(err);
        connection.release();
        resolve();
      });
    });

    this.pool = pool;
  }

  service(): Pool | undefined {
    return this.pool;
  }

  async shutdown(): Promise<void> {
    if (!this.pool) return;
    await new Promise<void>((resolve, reject) => {
      this.pool?.end((err) => (err ? reject(err) : resolve()));
    });
    this.pool = undefined;
  }
}
