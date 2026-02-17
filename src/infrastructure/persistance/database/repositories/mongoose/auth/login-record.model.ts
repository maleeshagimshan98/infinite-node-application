import mongoose, { Schema } from 'mongoose';

import type { ILoginRecord } from '@/domain/auth/models/login-record.model';

export const loginRecordSchema = new Schema<ILoginRecord>(
  {
    user_id: { type: String, required: true },
    token: { type: String, required: true },
    valid_till: { type: Date, required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired'], required: true },
  },
  { timestamps: true },
);

export const LoginRecordModel = mongoose.model('login_record', loginRecordSchema);
