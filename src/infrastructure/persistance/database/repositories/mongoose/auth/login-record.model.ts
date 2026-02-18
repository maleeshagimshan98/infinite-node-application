import mongoose, { Schema } from 'mongoose';

type LoginRecordStatus = 'active' | 'cancelled' | 'expired';

export interface ILoginRecordSchema {
  _id?: string;
  user_id: string;
  token: string;
  valid_till: Date;
  status: LoginRecordStatus;
}

export const loginRecordSchema = new Schema<ILoginRecordSchema>(
  {
    user_id: { type: String, required: true },
    token: { type: String, required: true },
    valid_till: { type: Date, required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired'], required: true },
  },
  { timestamps: true },
);

export const LoginRecordModel = mongoose.model('login_record', loginRecordSchema);
