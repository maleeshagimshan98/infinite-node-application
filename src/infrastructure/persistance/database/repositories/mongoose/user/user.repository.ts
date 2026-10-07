/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { User, NewUser } from '@/domain/user/models/user';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';

import { BaseRepository } from '../base/base-repository';
import { UserMapper } from './user.mapper';
import { UserModel } from './user.model';

import type { INewUserSchema } from './user.model';
import type { PopulateOptions } from 'mongoose';

export class UserRepository extends BaseRepository<INewUserSchema, User, NewUser> implements IUserRepository {
  constructor() {
    super(UserModel, new UserMapper());
  }

  /**
   * Populate a user's role_id and, one level further, each of that role's granted
   * resource_permissions entries — the full User → Role → Resources chain RBAC checks need.
   * This is the maximum depth this codebase permits via .populate(); see the Population Strategy
   * rule in CLAUDE.md/AGENTS.md.
   *
   * @returns {(string | PopulateOptions)[]} Mongoose population paths/options.
   */
  protected populateOptions(): (string | PopulateOptions)[] {
    return [
      {
        path: 'role_id',
        // A role that no longer exists populates to null; keep the user's role_id instead, so the
        // user still maps (without a role) rather than losing the id.
        transform: (doc: unknown, id: unknown): unknown => doc ?? id,
        populate: { path: 'resource_permissions.resource_id' },
      },
    ];
  }
}

export default UserRepository;
