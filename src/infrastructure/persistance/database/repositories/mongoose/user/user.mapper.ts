/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewUser } from '@/domain/user/models/user';
import { User } from '@/domain/user/models/user';

import { PersistanceError } from '../../../errors/persistance.error';
import { BaseMapper } from '../base/base.mapper';
import { RoleMapper } from '../roles/role.mapper';

import type { INewUserSchema } from './user.model';
import type { INewRoleSchema } from '../roles/role.model';

type PopulatedRoleRef = INewRoleSchema & { _id: Types.ObjectId };

export class UserMapper extends BaseMapper<INewUserSchema, User, NewUser> {
  private readonly roleMapper = new RoleMapper();

  /**
   * Determine whether a user's role_id ref really holds a role document populated by Mongoose.
   * A ref that was not populated, or whose role no longer exists, is a bare Types.ObjectId; a
   * legacy document may hold no role_id at all.
   *
   * @param {unknown} ref - The role_id ref as returned by Mongoose.
   * @returns {ref is PopulatedRoleRef} True when the ref is a populated role document.
   */
  private isPopulatedRole(ref: unknown): ref is PopulatedRoleRef {
    return (
      typeof ref === 'object' &&
      ref !== null &&
      !(ref instanceof Types.ObjectId) &&
      '_id' in ref &&
      ref._id instanceof Types.ObjectId &&
      'name' in ref &&
      typeof ref.name === 'string' &&
      'default' in ref &&
      typeof ref.default === 'boolean' &&
      'resource_permissions' in ref &&
      Array.isArray(ref.resource_permissions)
    );
  }

  /**
   * Convert a persisted user document into a User domain model, resolving the populated role
   * into a full Role domain model when UserRepository has populated it.
   *
   * @param {INewUserSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {User} The mapped domain model; without a `role` when the role was not populated or no longer exists.
   * @throws {PersistanceError} When the stored role_id is neither a role document nor an ObjectId (e.g. missing).
   */
  toDomain(data: INewUserSchema & { _id: Types.ObjectId }): User {
    const user = {
      id: data._id.toString(),
      email: data.email,
      password: data.password,
      status: data.status,
      ug_id: data.ug_id,
    };
    // The schema types role_id as an ObjectId, but UserRepository.populateOptions() replaces it with
    // the role document at runtime - so check what is really there instead of trusting either.
    const roleRef: unknown = data.role_id;

    if (this.isPopulatedRole(roleRef)) {
      return new User({ ...user, role_id: roleRef._id.toString(), role: this.roleMapper.toDomain(roleRef) });
    }
    if (roleRef instanceof Types.ObjectId) {
      return new User({ ...user, role_id: roleRef.toString() });
    }
    throw new PersistanceError(`User ${user.id} has no valid role_id`);
  }

  /**
   * Convert a new/updated user domain model into its persistence schema shape.
   *
   * @param {NewUser} data - The domain model data to persist.
   * @returns {INewUserSchema} The persistence-ready schema object.
   */
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
