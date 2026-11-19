import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

type PasswordResetCodeStatus = 'active' | 'used' | 'cancelled' | 'expired';

export interface IPasswordResetCodeSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
  email: string;
  code: string;
  valid_till: Date;
  status: PasswordResetCodeStatus;
}

export const PasswordResetCodeSchema = new Schema<IPasswordResetCodeSchema>(
  {
    // Stored as normalizeEmail() leaves it, also for a write that bypasses the domain model; db:indexes audits it.
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    valid_till: { type: Date, required: true },
    status: { type: String, enum: ['active', 'used', 'cancelled', 'expired'], required: true },
  },
  { timestamps: true },
);

// At most one active reset code per email: issuing a new code cancels the old ones first.
PasswordResetCodeSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

export const PasswordResetCodeModel = model<IPasswordResetCodeSchema>('password_reset_code', PasswordResetCodeSchema);
