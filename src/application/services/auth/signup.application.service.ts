/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { SignupService } from '@/domain/auth/service/signup.service';
import type { UserGroupService } from '@/domain/user/service/user-group.service';
import type { RoleService } from '@/domain/auth/service/role.service';
import type { INewUser } from '@/domain/user/models/user';
import type { IDatabaseMapper } from '@/application/interfaces';

import { BaseApplicationService } from '../base/base.application.service';

/**
 * Orchestrates user registration across the two independent aggregates a new User depends on
 * (default UserGroup, default Role) in a single transaction, then delegates the actual write to
 * SignupService — which no longer resolves either default itself.
 *
 * @extends BaseApplicationService
 */
export class SignupApplicationService extends BaseApplicationService {
  private signupService: SignupService;
  private userGroupService: UserGroupService;
  private roleService: RoleService;

  constructor(
    database_mapper: IDatabaseMapper,
    signupService: SignupService,
    userGroupService: UserGroupService,
    roleService: RoleService,
  ) {
    super(database_mapper);
    this.signupService = signupService;
    this.userGroupService = userGroupService;
    this.roleService = roleService;
  }

  /**
   * Register a new user, assigning the default user group and default role server-side.
   *
   * @param {INewUser} userData - User registration data. Any `ug_id`/`role_id` supplied by the
   * caller is ignored — both are always resolved to the current defaults.
   * @returns {Promise<{ id: string; status: string }>} The created user's id and status.
   * @throws {DomainServiceError} UNKNOWN_ERROR when no default user group or default role is available.
   * @throws {DomainServiceError} VALIDATION_ERROR when the email is already associated with another account.
   */
  async register(userData: INewUser): Promise<{ id: string; status: string }> {
    return this.dbTransaction(async ({ session }) => {
      const defaultUserGroup = await this.userGroupService.getDefaultGroup();
      if (!defaultUserGroup) {
        throw new DomainServiceError('No default customer group is available', 'UNKNOWN_ERROR');
      }

      const defaultRole = await this.roleService.getDefaultRole();
      if (!defaultRole) {
        throw new DomainServiceError('No default role is available', 'UNKNOWN_ERROR');
      }

      return this.signupService.register(
        { ...userData, ug_id: defaultUserGroup.id, role_id: defaultRole.id },
        { session },
      );
    });
  }

  /**
   * Verify a user's email and activate their account.
   *
   * @param {string} email - The user's email.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given email.
   */
  async verifyEmail(email: string): Promise<void> {
    return this.signupService.verifyEmail(email);
  }
}

export default SignupApplicationService;
