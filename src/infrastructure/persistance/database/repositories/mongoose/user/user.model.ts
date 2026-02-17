import { Schema, model } from 'mongoose';

import type { INewUser } from '@/domain/user/models/user.model';

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
