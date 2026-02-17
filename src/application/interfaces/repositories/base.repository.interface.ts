/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IBaseRepository<T, L> {
  create: (item: T, session?: unknown) => Promise<L>;
  findById: (id: string, session?: unknown) => Promise<L | null>;
  findOne: (filter: Partial<T>, session?: unknown) => Promise<L | null>;
  update: (id: string, item: Partial<T>, session?: unknown) => Promise<L | null>;
  delete: (id: string, session?: unknown) => Promise<void>;
}
