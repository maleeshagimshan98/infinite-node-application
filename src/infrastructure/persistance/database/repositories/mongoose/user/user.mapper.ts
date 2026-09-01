/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewUser } from '@/domain/user/models/user';
import { User } from '@/domain/user/models/user';

import { BaseMapper } from '../base/base.mapper';
import { RoleMapper } from '../roles/role.mapper';

import type { INewUserSchema } from './user.model';
import type { INewRoleSchema } from '../roles/role.model';

type PopulatedRoleRef = INewRoleSchema & { _id: Types.ObjectId };

export class UserMapper extends BaseMapper<INewUserSchema, User, NewUser> {
  private readonly roleMapper = new RoleMapper();

  /**
   * Determine whether a user's role_id ref has been populated by Mongoose.
   * UserRepository.populateOptions() always populates this path, so at runtime a not-yet-populated
   * ref is a real Types.ObjectId, and a populated one never is.
   *
   * @param {Types.ObjectId | PopulatedRoleRef} ref - The role_id ref as returned by Mongoose.
   * @returns {ref is PopulatedRoleRef} True when the ref has been populated.
   */
  private isPopulatedRole(ref: Types.ObjectId | PopulatedRoleRef): ref is PopulatedRoleRef {
    return !(ref instanceof Types.ObjectId);
  }

  toDomain(data: INewUserSchema & { _id: Types.ObjectId }): User {
    // UserRepository.populateOptions() always populates role_id (with a nested populate on
    // resource_permissions.resource_id), so at runtime it is actually a PopulatedRoleRef even
    // though IBaseMapper's contract types this parameter as the raw (unpopulated) schema shape.
    const roleRef = data.role_id as unknown as Types.ObjectId | PopulatedRoleRef;
    const populated = this.isPopulatedRole(roleRef);

    return new User({
      id: data._id.toString(),
      email: data.email,
      password: data.password,
      status: data.status,
      ug_id: data.ug_id,
      role_id: populated ? roleRef._id.toString() : roleRef.toString(),
      ...(populated && { role: this.roleMapper.toDomain(roleRef) }),
    });
  }

  toPersistence(data: NewUser): INewUserSchema {
    const base = {
      email: data.email,
      password: data.password,
      status: data.status,
      ug_id: data.ug_id,
      // toFilter() (inherited from BaseMapper) calls toPersistence with a partial filter object
      // cast to NewUser, so role_id may genuinely be absent here (e.g. findOne({ email }), used by
      // the signup flow's existing-user check) — keep this conditional so an unrelated filter
      // never picks up an incorrect role_id clause, and so toFilter's undefined-stripping works
      // instead of `new Types.ObjectId(undefined)` throwing.
      ...(data.role_id !== undefined && { role_id: new Types.ObjectId(data.role_id) }),
    };
    return (!data.id ? base : { ...base, _id: new Types.ObjectId(data.id) }) as INewUserSchema;
  }
}
