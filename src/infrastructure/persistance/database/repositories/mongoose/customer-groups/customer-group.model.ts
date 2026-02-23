import mongoose, { Schema } from 'mongoose';

export interface INewCustomerGroupSchema {
  _id?: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export const CustomerGroupSchema: Schema = new Schema<INewCustomerGroupSchema>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  discount: { type: Number, required: true },
  default: { type: Boolean, required: true },
});

export const CustomerGroupModel = mongoose.model<INewCustomerGroupSchema>('customer-group', CustomerGroupSchema);
