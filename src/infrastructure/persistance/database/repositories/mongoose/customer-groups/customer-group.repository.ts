/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { CustomerGroup, NewCustomerGroup } from '@/domain/user/models/customer-group';

import { BaseRepository } from '../base/base-repository';
import { CustomerGroupMapper } from './customer-group.mapper';
import { CustomerGroupModel } from './customer-group.model';

import type { INewCustomerGroupSchema } from './customer-group.model';

export class CustomerGroupRepository extends BaseRepository<INewCustomerGroupSchema, CustomerGroup, NewCustomerGroup> {
  constructor() {
    super(CustomerGroupModel, new CustomerGroupMapper());
  }
}

export default CustomerGroupRepository;
