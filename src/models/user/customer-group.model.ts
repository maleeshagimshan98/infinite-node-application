import mongoose, { Schema } from 'mongoose';

export interface ICustomerGroup {
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export const CustomerGroupSchema: Schema = new Schema<ICustomerGroup>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  discount: { type: Number, required: true },
  default: { type: Boolean, required: true },
});

export const CustomerGroup = mongoose.model<ICustomerGroup>('customer-group', CustomerGroupSchema);
