/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Resource, NewResource } from '@/domain/auth/models/resource';

import type { IBaseRepository } from '../base.repository.interface';

export interface IResourceRepository extends IBaseRepository<Resource, NewResource> {}

export default IResourceRepository;
