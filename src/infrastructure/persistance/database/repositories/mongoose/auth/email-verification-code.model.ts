/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

type EmailVerificationCodeStatus = 'pending' | 'verified' | 'expired';

export interface INewEmailVerificationCodeSchema {
  _id?: Types.ObjectId;
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
    email: { type: String, required: true },
    code: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'expired'], required: true },
    valid_till: { type: Date, required: true },
    verified_at: { type: Date },
  },
  { timestamps: true },
);

export const EmailVerificationCodeModel = model<INewEmailVerificationCodeSchema>(
  'email_verification_code',
  EmailVerificationCodeSchema,
);
