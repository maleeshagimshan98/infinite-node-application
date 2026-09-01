/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Role, NewRole } from '@/domain/auth/models/role';

import type { IBaseRepository } from '../base.repository.interface';

export interface IRoleRepository extends IBaseRepository<Role, NewRole> {}

export default IRoleRepository;
