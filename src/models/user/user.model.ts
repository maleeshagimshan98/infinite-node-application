import { Schema, model } from 'mongoose';
import type { IAddress } from './address.model';
import { AddressSchema } from './address.model';

type UserStatus = 'pending_verification' | 'active' | 'suspended';

export interface INewUser {
  profile: {
    fisrt_name?: string;
    last_name?: string;
    email: string;
    address?: IAddress[];
    phone?: string;
    profile_img?: string;
  };
  password: string;
  status: UserStatus;
  cg_id: string;
}

export interface IUser {
  profile: {
    fisrt_name: string;
    last_name: string;
    email: string;
    address: IAddress[];
    phone?: string;
    profile_img?: string;
  };
  password: string;
  status: UserStatus;
  cg_id: string;
}

export const UserSchema = new Schema<INewUser>(
  {
    profile: {
      first_name: { type: String, required: true },
      last_name: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: Array, of: AddressSchema, required: true },
      phone: { type: String, required: true },
      profile_img: { type: String, required: false },
    },
    password: { type: String, required: true },
    status: { type: String, enum: ['pending_verification', 'active', 'suspended'], required: true },
    cg_id: { type: String, required: true },
  },
  { timestamps: true },
);

// UserSchema.methods.getObj = () => {

// };

export const User = model('user', UserSchema);
