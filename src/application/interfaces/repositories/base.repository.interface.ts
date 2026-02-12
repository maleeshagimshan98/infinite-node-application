/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IBaseRepository<T> {
  create(item: T, session?: unknown): Promise<T>;
  findById(id: string, session?: unknown): Promise<T | null>;
  findOne(filter: Partial<T>, session?: unknown): Promise<T | null>;
  update(id: string, item: Partial<T>, session?: unknown): Promise<T>;
  delete(id: string, session?: unknown): Promise<void>;
}
