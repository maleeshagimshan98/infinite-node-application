/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICustomerGroup } from '@/domain/user/models/customer-group.model';
import type { CustomerGroup } from '@/domain/user/models/customer-group.model';

import { BaseRepository } from '../base/base-repository';
import { CustomerGroupMapper } from './customer-group.mapper';

import type mongoose from 'mongoose';

export class CustomerGroupRepository extends BaseRepository<ICustomerGroup, CustomerGroup> {
  constructor(customerGroupModel: mongoose.Model<ICustomerGroup>) {
    super(customerGroupModel, new CustomerGroupMapper());
  }
}
