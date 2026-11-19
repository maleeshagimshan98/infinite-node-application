/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { TransactionOptions } from '@/application/interfaces/infrastructure/database-mapper.interface';

/**
 * An entity read from the database: it carries the version it was read at, the number of times it has been updated.
 * `update()` writes only while the stored version still equals it.
 */
export interface IVersionedEntity {
  readonly version: number;
}

/**
 * Base repository interface for data persistence operations.
 * Filters use domain model types — infrastructure-specific field names are translated
 * internally by the concrete repository via the mapper's `toFilter` method.
 *
 * @template DomainModel - The existing domain model (id and version required).
 * @template NewDomainModel - The new domain model used for creation (id and version optional).
 */
export interface IBaseRepository<DomainModel extends IVersionedEntity, NewDomainModel> {
  /**
   * Create a new entity
   *
   * @param {NewDomainModel} item - New domain model instance to persist
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel>} The persisted domain model
   * @throws {RepositoryError} DUPLICATE_KEY when a unique index rejects the entity; INVALID_ID for a malformed id in
   * `item`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  create(item: NewDomainModel, transactionOptions?: TransactionOptions): Promise<DomainModel>;

  /**
   * Bulk-create entities
   *
   * @param {NewDomainModel[]} items - Array of new domain model instances
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel[]>} Array of persisted domain models
   * @throws {RepositoryError} DUPLICATE_KEY when a unique index rejects an entity; INVALID_ID for a malformed id in
   * `items`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  bulkCreate(items: NewDomainModel[], transactionOptions?: TransactionOptions): Promise<DomainModel[]>;

  /**
   * Find an entity by its ID
   *
   * @param {string} id - Entity identifier
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel | null>} The domain model, or null if not found
   * @throws {RepositoryError} INVALID_ID when `id` is malformed.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  findById(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null>;

  /**
   * Find a single entity matching the filter
   *
   * @param {Partial<NewDomainModel>} filter - Partial new domain model fields to match against
   * @param {Record<string, 1 | -1>} [sort] - Optional sort order (1 = ascending, -1 = descending)
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel | null>} The domain model, or null if not found
   * @throws {RepositoryError} INVALID_ID for a malformed id in `filter`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  findOne(
    filter: Partial<NewDomainModel>,
    sort?: Record<string, 1 | -1>,
    transactionOptions?: TransactionOptions,
  ): Promise<DomainModel | null>;

  /**
   * Find multiple entities matching the filter
   *
   * @param {Partial<NewDomainModel>} filter - Partial new domain model fields to match against
   * @param {number} [limit] - Maximum number of results
   * @param {number} [offset] - Number of results to skip
   * @param {Record<string, 1 | -1>} [sort] - Optional sort order
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel[]>} Array of domain models
   * @throws {RepositoryError} INVALID_ID for a malformed id in `filter`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
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
   *
   * @param {Partial<NewDomainModel>} filter - Partial new domain model fields to match against
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<number>} Count of matching entities
   * @throws {RepositoryError} INVALID_ID for a malformed id in `filter`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  count(filter: Partial<NewDomainModel>, transactionOptions?: TransactionOptions): Promise<number>;

  /**
   * Update an entity by ID, only while the stored version still equals `item.version`. The update advances the
   * stored version by one, in the same write.
   *
   * @param {string} id - Entity identifier
   * @param {DomainModel} item - The entity as read and then changed; its `version` is the version it was read at
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel | null>} The updated domain model with its new version, or null if no entity has
   * the ID
   * @throws {RepositoryError} VERSION_CONFLICT when the entity was updated after `item` was read (a stale version);
   * DUPLICATE_KEY when a unique index rejects the change; INVALID_ID for a malformed `id` or id in `item`.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  update(id: string, item: DomainModel, transactionOptions?: TransactionOptions): Promise<DomainModel | null>;

  /**
   * Delete an entity by ID
   *
   * @param {string} id - Entity identifier
   * @param {TransactionOptions} [transactionOptions] - Optional database transaction session.
   * @returns {Promise<DomainModel | null>} The deleted domain model, or null if not found
   * @throws {RepositoryError} INVALID_ID when `id` is malformed.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached; DATABASE_ERROR for any
   * other database failure.
   */
  delete(id: string, transactionOptions?: TransactionOptions): Promise<DomainModel | null>;
}
