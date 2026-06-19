/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { CustomerGroup, NewCustomerGroup } from '@/domain/user/models/customer-group';

import type { IBaseRepository } from '../base.repository.interface';

export interface ICustomerGroupRepository extends IBaseRepository<CustomerGroup, NewCustomerGroup> {}

export default ICustomerGroupRepository;
