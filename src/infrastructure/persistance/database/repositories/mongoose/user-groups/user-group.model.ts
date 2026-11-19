import mongoose, { Schema } from 'mongoose';

import type { Types } from 'mongoose';

export interface INewUserGroupSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export const UserGroupSchema: Schema = new Schema<INewUserGroupSchema>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  discount: { type: Number, required: true },
  default: { type: Boolean, required: true },
});

UserGroupSchema.index({ name: 1 }, { unique: true });
// At most one default group; any number of non-default ones. Switching the default must unset the old one first.
UserGroupSchema.index({ default: 1 }, { unique: true, partialFilterExpression: { default: true } });

export const UserGroupModel = mongoose.model<INewUserGroupSchema>('user-group', UserGroupSchema);
