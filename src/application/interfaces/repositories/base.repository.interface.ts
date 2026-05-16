/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { TransactionOptions } from '../database-mapper.interface';

export type RepositryFilter = {
  [key: string]: string | {};
};

/**
 * Base repository interface for data persistence operations.
 *
 * @template DBSchema - The interface used to define the Mongoose schema structure.
 *                      This represents the shape of data as it exists in the database.
 * @template DomainModel - The type of the domain object class.
 *                         This represents the rich domain model with business logic.
 * @template NewDomainModel - The type of the new domain object class.
 *                              This represents the data required to create a new domain model instance.
 */
export interface IBaseRepository<DBSchema, DomainModel, NewDomainModel> {
  create: (item: NewDomainModel, transactionOptions?: TransactionOptions) => Promise<DomainModel>;
  findById: (id: string, transactionOptions?: TransactionOptions) => Promise<DomainModel | null>;
  findOne: (
    filter: Partial<DBSchema>,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ) => Promise<DomainModel | null>;
  find: (
    filter: Partial<DBSchema>,
    limit?: number,
    offset?: number,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ) => Promise<DomainModel[]>;
  count: (filter: Partial<DBSchema>, transactionOptions?: TransactionOptions) => Promise<number>;
  update: (id: string, item: NewDomainModel, transactionOptions?: TransactionOptions) => Promise<DomainModel | null>;
  delete: (id: string, transactionOptions?: TransactionOptions) => Promise<void>;
}
