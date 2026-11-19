import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

type UserStatus = 'pending_verification' | 'active' | 'suspended';
export interface INewUserSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
  email: string;
  password: string;
  status: UserStatus;
  ug_id: string;
  role_id: Types.ObjectId;
}

export const UserSchema = new Schema<INewUserSchema>(
  {
    // Stored as normalizeEmail() leaves it, also for a write that bypasses the domain model; db:indexes audits it.
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'suspended'],
      required: true,
      default: 'pending_verification',
    },
    ug_id: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'role', required: true },
  },
  { timestamps: true },
);

// One account per email. Emails are stored trimmed and in lowercase (normalizeEmail()), so this also rejects case variants.
UserSchema.index({ email: 1 }, { unique: true });

// UserSchema.methods.getObj = () => {

// };

export const UserModel = model('user', UserSchema);
