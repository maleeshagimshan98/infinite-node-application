/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

type EmailVerificationCodeStatus = 'pending' | 'verified' | 'expired';

export interface INewEmailVerificationCodeSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
  user_id: Types.ObjectId;
  email: string;
  code: string;
  status: EmailVerificationCodeStatus;
  valid_till: Date;
  verified_at?: Date;
}

export const EmailVerificationCodeSchema = new Schema<INewEmailVerificationCodeSchema>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    // Stored as normalizeEmail() leaves it, also for a write that bypasses the domain model; db:indexes audits it.
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'expired'], required: true },
    valid_till: { type: Date, required: true },
    verified_at: { type: Date },
  },
  { timestamps: true },
);

// At most one pending code per email: issuing a new code expires the pending one first.
EmailVerificationCodeSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export const EmailVerificationCodeModel = model<INewEmailVerificationCodeSchema>(
  'email_verification_code',
  EmailVerificationCodeSchema,
);
