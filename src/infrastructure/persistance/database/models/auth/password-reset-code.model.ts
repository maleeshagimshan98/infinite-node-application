import { Schema, model } from 'mongoose';

export interface IPasswordResetCodes {
  email: string;
  code: string;
  valid_till: Date;
  status: 'active' | 'used' | 'cancelled' | 'expired';
}

export const PasswordResetCodesSchema = new Schema<IPasswordResetCodes>({
  email: { type: String, required: true },
  code: { type: String, required: true },
  valid_till: { type: Date, required: true },
  status: { type: String, enum: ['active', 'used', 'cancelled', 'expired'], required: true },
});

export const PasswordResetCodesModel = model<IPasswordResetCodes>('password_reset_code', PasswordResetCodesSchema);
