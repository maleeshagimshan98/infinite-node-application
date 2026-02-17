import mongoose, { Schema } from 'mongoose';

import type { INewCustomerGroup } from '@/domain/user/models/customer-group.model';

export const CustomerGroupSchema: Schema = new Schema<INewCustomerGroup>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  discount: { type: Number, required: true },
  default: { type: Boolean, required: true },
});

export const CustomerGroup = mongoose.model<INewCustomerGroup>('customer-group', CustomerGroupSchema);
