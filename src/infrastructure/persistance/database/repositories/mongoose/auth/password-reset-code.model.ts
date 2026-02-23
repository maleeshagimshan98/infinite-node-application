import { Schema, model } from 'mongoose';

type PasswordResetCodeStatus = 'active' | 'used' | 'cancelled' | 'expired';

export interface IPasswordResetCodeSchema {
  _id?: string;
  email: string;
  code: string;
  valid_till: Date;
  status: PasswordResetCodeStatus;
}

export const PasswordResetCodeSchema = new Schema<IPasswordResetCodeSchema>(
  {
    email: { type: String, required: true },
    code: { type: String, required: true },
    valid_till: { type: Date, required: true },
    status: { type: String, enum: ['active', 'used', 'cancelled', 'expired'], required: true },
  },
  { timestamps: true },
);

export const PasswordResetCodeModel = model<IPasswordResetCodeSchema>('password_reset_code', PasswordResetCodeSchema);
