/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { NewCustomerGroup } from '@/domain/user/models/customer-group';
import { CustomerGroup } from '@/domain/user/models/customer-group';

import type { IBaseMapper } from '../base/base.mapper.interface';
import type { INewCustomerGroupSchema } from './customer-group.model';

export class CustomerGroupMapper implements IBaseMapper<INewCustomerGroupSchema, CustomerGroup, NewCustomerGroup> {
  toDomain(data: INewCustomerGroupSchema & { _id: string }): CustomerGroup {
    return new CustomerGroup({
      id: data._id,
      name: data.name,
      description: data.description,
      discount: data.discount,
      default: data.default,
    });
  }

  toPersistence(data: NewCustomerGroup): INewCustomerGroupSchema {
    return !data.id
      ? {
          // New entity (no ID yet)
          name: data.name,
          description: data.description,
          discount: data.discount,
          default: data.default,
        }
      : {
          // Existing entity (has ID)
          _id: data.id,
          name: data.name,
          description: data.description,
          discount: data.discount,
          default: data.default,
        };
  }
}
