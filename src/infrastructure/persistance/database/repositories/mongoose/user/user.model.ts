import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

type UserStatus = 'pending_verification' | 'active' | 'suspended';
export interface INewUserSchema {
  _id?: Types.ObjectId;
  email: string;
  password: string;
  status: UserStatus;
  ug_id: string;
}

export const UserSchema = new Schema<INewUserSchema>(
  {
    email: { type: String, required: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended'],
      required: true,
      default: 'pending_verification',
    },
    ug_id: { type: String, required: true },
  },
  { timestamps: true },
);

// UserSchema.methods.getObj = () => {

// };

export const UserModel = model('user', UserSchema);
