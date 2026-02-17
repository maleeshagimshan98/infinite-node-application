/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IBaseMapper<T, K> {
  /**
   * Convert raw database data to a domain model instance of type K
   *
   * @param {T} data An interface representing the raw data from the database
   * @return {K} An instance of type K representing the domain model
   */
  toDomain: (data: T) => K;

  /**
   * Convert a domain model instance of type K to a format suitable for persistence in the database
   *
   * @param {K} data An instance of type K representing the domain model
   * @return {T} A plain object representing the data to be stored in the database
   */
  toPersistence: (data: K) => T;
}
