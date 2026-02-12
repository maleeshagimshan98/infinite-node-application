import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

type UserStatus = 'pending_verification' | 'active' | 'suspended';

export interface INewUser {
  _id?: string | Types.ObjectId;
  email: string;
  password: string;
  status: UserStatus;
  cg_id: string;
}

export interface IUser {
  _id: string | Types.ObjectId;
  email: string;
  password: string;
  status: UserStatus;
  cg_id: string;
}

export const UserSchema = new Schema<INewUser>(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended'],
      required: true,
      default: 'pending_verification',
    },
    cg_id: { type: String, required: true },
  },
  { timestamps: true },
);

// UserSchema.methods.getObj = () => {

// };

export const User = model('user', UserSchema);
