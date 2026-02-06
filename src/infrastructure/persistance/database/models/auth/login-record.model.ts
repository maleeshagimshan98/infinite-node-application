import mongoose, { Schema } from 'mongoose';

export interface ILoginRecord {
  user_id: string;
  token: string;
  valid_till: Date;
  status: 'active' | 'cancelled' | 'expired';
}

export const loginRecordSchema = new Schema<ILoginRecord>({
  user_id: { type: String, required: true },
  token: { type: String, required: true },
  valid_till: { type: Date, required: true },
  status: { type: String, required: true },
});

export const LoginRecord = mongoose.model('login_record', loginRecordSchema);
