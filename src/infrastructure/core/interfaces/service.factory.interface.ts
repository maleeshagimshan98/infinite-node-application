/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * Generic interface for a service factory that creates instances of a specific type T.
 *
 * @template T - The type of service that the factory creates.
 */
export interface IServiceFactory<T> {
  create(): Promise<T>;
}
