import { Schema } from 'mongoose';

export interface IAddress {
  st_line_1: string;
  st_line_2?: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  is_billing_address: boolean;
}

export const AddressSchema: Schema = new Schema<IAddress>({
  st_line_1: { type: String, required: true },
  st_line_2: { type: String, required: false },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipcode: { type: String, required: true },
  is_billing_address: { type: Boolean, required: true },
});
