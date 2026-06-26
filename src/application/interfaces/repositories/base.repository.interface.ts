/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { TransactionOptions } from '../database-mapper.interface';

/**
 * Base repository interface for data persistence operations.
 * Filters use domain model types — infrastructure-specific field names are translated
 * internally by the concrete repository via the mapper's `toFilter` method.
 *
 * @template DomainModel - The existing domain model (id required).
 * @template NewDomainModel - The new domain model used for creation (id optional).
 */
export interface IBaseRepository<DomainModel, NewDomainModel> {
  /**
   * Create a new entity
   * @param item - New domain model instance to persist
   * @param transactionOptions - Optional database transaction session
   * @returns The persisted domain model
   */
  create(item: NewDomainModel, transactionOptions?: TransactionOptions): Promise<DomainModel>;

  /**
   * Bulk-create entities
   * @param items - Array of new domain model instances
   * @param transactionOptions - Optional database transaction session
   * @returns Array of persisted domain models
   */
  bulkCreate(items: NewDomainModel[], transactionOptions?: TransactionOptions): Promise<DomainModel[]>;

  /**
   * Find an entity by its ID
   * @param id - Entity identifier
   * @param transactionOptions - Optional database transaction session
   * @returns The domain model, or null if not found
   */
  findById(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null>;

  /**
   * Find a single entity matching the filter
   * @param filter - Partial new domain model fields to match against
   * @param sort - Optional sort order (1 = ascending, -1 = descending)
   * @param transactionOptions - Optional database transaction session
   * @returns The domain model, or null if not found
   */
  findOne(
    filter: Partial<NewDomainModel>,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel | null>;

  /**
   * Find multiple entities matching the filter
   * @param filter - Partial new domain model fields to match against
   * @param limit - Maximum number of results
   * @param offset - Number of results to skip
   * @param sort - Optional sort order
   * @param transactionOptions - Optional database transaction session
   * @returns Array of domain models
   */
  find(
    filter: Partial<NewDomainModel>,
    limit?: number,
    offset?: number,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel[]>;

  /**
   * Count entities matching the filter
   * @param filter - Partial new domain model fields to match against
   * @param transactionOptions - Optional database transaction session
   * @returns Count of matching entities
   */
  count(filter: Partial<NewDomainModel>, transactionOptions?: TransactionOptions): Promise<number>;

  /**
   * Update an entity by ID
   * @param id - Entity identifier
   * @param item - Updated new domain model instance
   * @param transactionOptions - Optional database transaction session
   * @returns The updated domain model, or null if not found
   */
  update(id: string, item: NewDomainModel, transactionOptions?: TransactionOptions): Promise<DomainModel | null>;

  /**
   * Delete an entity by ID
   * @param id - Entity identifier
   * @param transactionOptions - Optional database transaction session
   * @returns The deleted domain model, or null if not found
   */
  delete(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null>;
}
