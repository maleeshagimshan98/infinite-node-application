/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Resource, NewResource } from '@/domain/auth/models/resource';
import type { IResourceRepository } from '@/application/interfaces/repositories/auth/resource.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { ResourceMapper } from './resource.mapper';
import { ResourceModel } from './resource.model';

import type { INewResourceSchema } from './resource.model';

export class ResourceRepository
  extends BaseRepository<INewResourceSchema, Resource, NewResource>
  implements IResourceRepository
{
  constructor() {
    super(ResourceModel, new ResourceMapper());
  }
}

export default ResourceRepository;
