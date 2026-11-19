import { Schema, model } from 'mongoose';

import type { Types } from 'mongoose';

/**
 * Persistence-owned permission flag shape. Declared independently of the domain `IPermission`
 * (see `@/domain/auth/models/role`) so this schema file has zero dependency on the domain layer —
 * structurally identical today, but the mapper is the one place allowed to know both shapes exist.
 */
export interface IPermissionSchema {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

export interface INewRoleSchema {
  _id?: Types.ObjectId;
  // Mongoose's version key: 0 on insert; only BaseRepository.update() advances it. Mappers read it, never write it.
  __v?: number;
  name: string;
  description?: string;
  default: boolean;
  resource_permissions: {
    resource_id: Types.ObjectId;
    permission: IPermissionSchema;
  }[];
}

export const RoleSchema = new Schema<INewRoleSchema>(
  {
    name: { type: String, required: true },
    description: { type: String },
    default: { type: Boolean, required: true },
    resource_permissions: [
      {
        _id: false,
        resource_id: { type: Schema.Types.ObjectId, ref: 'resource', required: true },
        permission: {
          read: { type: Boolean, required: true },
          write: { type: Boolean, required: true },
          update: { type: Boolean, required: true },
          delete: { type: Boolean, required: true },
        },
      },
    ],
  },
  { timestamps: true },
);

RoleSchema.index({ name: 1 }, { unique: true });
// At most one default role; any number of non-default ones. Switching the default must unset the old one first.
RoleSchema.index({ default: 1 }, { unique: true, partialFilterExpression: { default: true } });

export const RoleModel = model<INewRoleSchema>('role', RoleSchema);
