import { Schema, model } from 'mongoose';

import type { IPasswordResetCode } from '@/domain/auth/models/password-reset-code.model';

export const PasswordResetCodeSchema = new Schema<IPasswordResetCode>(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    valid_till: { type: Date, required: true },
    status: { type: String, enum: ['active', 'used', 'cancelled', 'expired'], required: true },
  },
  { timestamps: true },
);

export const PasswordResetCodeModel = model<IPasswordResetCode>('password_reset_code', PasswordResetCodeSchema);
