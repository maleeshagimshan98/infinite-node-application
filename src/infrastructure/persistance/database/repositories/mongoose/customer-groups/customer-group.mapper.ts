/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { CustomerGroup } from '@/domain/user/models/customer-group.model';
import type { ICustomerGroup } from '@/domain/user/models/customer-group.model';

import type { IBaseMapper } from '../base/base.mapper.interface';

export class CustomerGroupMapper implements IBaseMapper<ICustomerGroup, CustomerGroup> {
  toDomain(data: ICustomerGroup): CustomerGroup {
    return new CustomerGroup(data);
  }

  toPersistence(data: CustomerGroup): ICustomerGroup {
    return {
      _id: data._id,
      name: data.name,
      description: data.description,
      discount: data.discount,
      default: data.default,
    };
  }
}
