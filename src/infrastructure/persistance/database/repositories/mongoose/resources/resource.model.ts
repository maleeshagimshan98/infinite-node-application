import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

export interface INewResourceSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
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

ResourceSchema.index({ name: 1 }, { unique: true });

export const ResourceModel = model<INewResourceSchema>('resource', ResourceSchema);
