/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * IAppMetadata — identifying details of the running application
 *
 * InfiniteNodeApplication and InfiniteNodeWorker register it in the DI container as `appMetadata`
 * before the infrastructure services start, so any service or controller can take it as a constructor parameter.
 */
export interface IAppMetadata {
  readonly name: string;
  readonly version: string;
  readonly url: string;
  readonly port: string;
  readonly environment: string;
}
