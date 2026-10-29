/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Schema, model } from 'mongoose';

import type { EmailStatus } from '@/domain/app/email/models/email';

import type { Types } from 'mongoose';

const SECONDS_PER_DAY = 24 * 60 * 60;
const DEFAULT_EMAIL_LOG_TTL_DAYS = 30;

const emailLogTtlDays = Number(process.env.EMAIL_LOG_TTL_DAYS);
const EMAIL_LOG_TTL_SECONDS = Math.round(
  (emailLogTtlDays > 0 ? emailLogTtlDays : DEFAULT_EMAIL_LOG_TTL_DAYS) * SECONDS_PER_DAY,
);

export interface INewEmailSchema {
  _id?: Types.ObjectId;
  // Optional only here: the inherited toFilter() runs partial filters through EmailMapper.toPersistence(), which
  // must then leave user_id out. The schema below still requires it.
  user_id?: Types.ObjectId;
  sent_on?: Date;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  status: EmailStatus;
  error_message?: string;
  ttl: number;
}

export const EmailSchema = new Schema<INewEmailSchema>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    sent_on: { type: Date },
    to: { type: [String] },
    cc: { type: [String] },
    bcc: { type: [String] },
    subject: { type: String, required: true },
    // Not `required`: Mongoose rejects '' for a required string, and the body is emptied once the email is sent or fails.
    body: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'sent', 'failed'], required: true },
    error_message: { type: String },
    ttl: { type: Number, required: true },
  },
  { timestamps: true },
);

// MongoDB keeps an existing TTL index's expireAfterSeconds when EMAIL_LOG_TTL_DAYS changes; apply a new value with
// collMod (or drop the index so it is rebuilt).
EmailSchema.index({ createdAt: 1 }, { expireAfterSeconds: EMAIL_LOG_TTL_SECONDS });

export const EmailModel = model<INewEmailSchema>('email_log', EmailSchema);
