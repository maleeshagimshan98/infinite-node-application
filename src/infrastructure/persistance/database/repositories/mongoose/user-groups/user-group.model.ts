import mongoose, { Schema } from 'mongoose';

export interface INewUserGroupSchema {
  _id?: string;
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

export const UserGroupModel = mongoose.model<INewUserGroupSchema>('user-group', UserGroupSchema);
