/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewRole } from '@/domain/auth/models/role';
import { Role } from '@/domain/auth/models/role';

import { BaseMapper } from '../base/base.mapper';
import { ResourceMapper } from '../resources/resource.mapper';

import type { INewRoleSchema, IPermissionSchema } from './role.model';
import type { INewResourceSchema } from '../resources/resource.model';

type PopulatedResourceRef = INewResourceSchema & { _id: Types.ObjectId };

export class RoleMapper extends BaseMapper<INewRoleSchema, Role, NewRole> {
  private readonly resourceMapper = new ResourceMapper();

  /**
   * Determine whether a resource_permissions entry's resource_id ref has been populated by
   * Mongoose. RoleRepository.populateOptions() always populates this path, so at runtime a
   * not-yet-populated ref is a real Types.ObjectId, and a populated one never is.
   *
   * @param {Types.ObjectId | PopulatedResourceRef} ref - The resource_id ref as returned by Mongoose.
   * @returns {ref is PopulatedResourceRef} True when the ref has been populated.
   */
  private isPopulatedResource(ref: Types.ObjectId | PopulatedResourceRef): ref is PopulatedResourceRef {
    return !(ref instanceof Types.ObjectId);
  }

  /**
   * Convert a persisted role document into a Role domain model, resolving populated resource
   * permissions into full Resource domain models when RoleRepository has populated them.
   *
   * @param {INewRoleSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {Role} The mapped domain model.
   */
  toDomain(data: INewRoleSchema & { _id: Types.ObjectId }): Role {
    // RoleRepository.populateOptions() always populates resource_permissions.resource_id, so at
    // runtime each entry's resource_id is actually a PopulatedResourceRef even though
    // IBaseMapper's contract types this parameter as the raw (unpopulated) schema shape.
    const entries = data.resource_permissions as unknown as {
      resource_id: Types.ObjectId | PopulatedResourceRef;
      permission: IPermissionSchema;
    }[];
    const firstEntry = entries[0];
    const populated = firstEntry !== undefined && this.isPopulatedResource(firstEntry.resource_id);

    return new Role({
      id: data._id.toString(),
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
      default: data.default,
      resource_permissions: entries.map((rp) => ({
        resource_id: populated
          ? (rp.resource_id as PopulatedResourceRef)._id.toString()
          : (rp.resource_id as Types.ObjectId).toString(),
        permission: rp.permission,
      })),
      resources: populated
        ? entries.map((rp) => ({
            resource: this.resourceMapper.toDomain(rp.resource_id as PopulatedResourceRef),
            permission: rp.permission,
          }))
        : [],
    });
  }

  /**
   * Convert a new/updated role domain model into its persistence schema shape.
   *
   * @param {NewRole} data - The domain model data to persist.
   * @returns {INewRoleSchema} The persistence-ready schema object.
   */
  toPersistence(data: NewRole): INewRoleSchema {
    const base = {
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
      default: data.default,
      // toFilter() (inherited from BaseMapper) calls toPersistence with a partial filter object
      // cast to NewRole, so resource_permissions may genuinely be absent here (e.g.
      // findOne({ default: true })) — keep this conditional so a filter never picks up an
      // incorrect `resource_permissions: []` clause, and so toFilter's undefined-stripping still
      // works instead of `.map()` crashing on a missing array.
      ...(data.resource_permissions !== undefined && {
        resource_permissions: data.resource_permissions.map((rp) => ({
          resource_id: new Types.ObjectId(rp.resource_id),
          permission: rp.permission,
        })),
      }),
    };
    return (!data.id ? base : { ...base, _id: new Types.ObjectId(data.id) }) as INewRoleSchema;
  }
}
