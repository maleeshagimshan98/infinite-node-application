/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mongoose, { Schema } from 'mongoose';

import type { LoginRecordStatus } from '@/domain/auth/models/login-record';

import type { Types } from 'mongoose';

export interface INewLoginRecordSchema {
  _id?: Types.ObjectId;
  user_id: string;
  token: string;
  refresh_token: string;
  access_token_valid_till: Date;
  refresh_token_valid_till: Date;
  status: LoginRecordStatus;
}

export const loginRecordSchema = new Schema<INewLoginRecordSchema>(
  {
    user_id: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    refresh_token: { type: String, required: true },
    access_token_valid_till: { type: Date, required: true },
    refresh_token_valid_till: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'revoked'], required: true },
  },
  { timestamps: true },
);

export const LoginRecordModel = mongoose.model('login_record', loginRecordSchema);
