/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IDatabase {
    connection(uri: string, options?: unknown): Promise<unknown>;
    withTransaction(callback: () => Promise<unknown>): Promise<unknown>;
}