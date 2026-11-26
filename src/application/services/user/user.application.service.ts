/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { UserService } from '@/domain/user/service/user.service';
import type { LoginService } from '@/domain/auth/service/login.service';
import type { INewUser, User } from '@/domain/user/models/user';
import type { LoginRecord } from '@/domain/auth/models/login-record';
import type { IDatabaseMapper } from '@/application/interfaces';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';

import { BaseApplicationService } from '../base/base.application.service';

/**
 * Runs user updates that end the user's sessions: a new password, or a status other than `active`, revokes every
 * active login session in the same transaction as the update, and the revoked sessions are dropped from the cache once
 * it commits.
 *
 * @extends BaseApplicationService
 */
export class UserApplicationService extends BaseApplicationService {
  private userService: UserService;
  private loginService: LoginService;
  private loginApplicationService: LoginApplicationService;

  constructor(
    database_mapper: IDatabaseMapper,
    userService: UserService,
    loginService: LoginService,
    loginApplicationService: LoginApplicationService,
  ) {
    super(database_mapper);
    this.userService = userService;
    this.loginService = loginService;
    this.loginApplicationService = loginApplicationService;
  }

  /**
   * Update a user by its id, in one transaction. When the update changes the password, or leaves the user in a status
   * other than `active`, every active session of the user is revoked in the same transaction (including the session
   * that made the request) and dropped from the cache after the commit.
   *
   * @param {string} id - The user id.
   * @param {Partial<INewUser>} data - The fields to update, and the `version` of the user the caller read.
   * @returns {Promise<User>} The updated user, with its new version.
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given id, or a login record is deleted while
   * it is being revoked.
   * @throws {DomainServiceError} CONFLICT when `data.version` is not the user's current version, or the user or one of
   * its login records changed during the update.
   * @throws {DomainServiceError} ALREADY_EXISTS when changing to an email already used by another account.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed, or the given role_id/ug_id is malformed or
   * does not exist.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR when the database fails.
   * @throws {InfrastructureError} CONNECTION_ERROR when the database cannot be reached while running or committing
   * the transaction.
   * @throws {PersistanceError} when the database otherwise fails while running, committing or aborting the
   * transaction.
   * @throws {Error} when argon2 cannot hash a new password.
   */
  async update(id: string, data: Partial<INewUser>): Promise<User> {
    const { user, revoked } = await this.dbTransaction(async ({ session }) => {
      const updated = await this.userService.update(id, data, { session });
      const revokedRecords: LoginRecord[] = this.endsSessions(data, updated)
        ? await this.loginService.revokeAllForUser(id, { session })
        : [];
      return { user: updated, revoked: revokedRecords };
    });

    // After the commit: evicting earlier would let a concurrent read re-trust a row the transaction then revoked.
    await this.loginApplicationService.evictLoginRecords(revoked);
    return user;
  }

  /**
   * Decide whether an update ends the user's sessions: a new password, or a status change that leaves the user in any
   * status other than `active` (e.g. `suspended`).
   *
   * @param {Partial<INewUser>} data - The update payload.
   * @param {User} user - The user after the update.
   * @returns {boolean} True when every active session of the user must be revoked.
   */
  private endsSessions(data: Partial<INewUser>, user: User): boolean {
    return data.password !== undefined || (data.status !== undefined && user.status !== 'active');
  }
}

export default UserApplicationService;
