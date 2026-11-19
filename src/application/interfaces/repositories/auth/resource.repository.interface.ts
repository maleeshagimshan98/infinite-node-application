/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Resource, NewResource } from '@/domain/auth/models/resource';

import type { IBaseRepository } from '../base.repository.interface';

// A type alias, not an empty interface (`@typescript-eslint/no-empty-object-type`); turn it into an interface
// that extends IBaseRepository once it gains queries of its own.
export type IResourceRepository = IBaseRepository<Resource, NewResource>;

export default IResourceRepository;
