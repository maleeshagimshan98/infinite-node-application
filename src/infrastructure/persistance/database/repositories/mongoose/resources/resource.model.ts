import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

export interface INewResourceSchema {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
}

export const ResourceSchema = new Schema<INewResourceSchema>(
  {
    name: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

export const ResourceModel = model<INewResourceSchema>('resource', ResourceSchema);
