/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { SignupService } from '@/domain/auth/service/signup.service';
import type { UserService } from '@/domain/user/service/user.service';
import type { UserGroupService } from '@/domain/user/service/user-group.service';
import type { RoleService } from '@/domain/auth/service/role.service';
import type { INewUser } from '@/domain/user/models/user';
import { NewEmail } from '@/domain/app/email/models/email';
import type { IDatabaseMapper } from '@/application/interfaces';
import type { IEmailService } from '@/application/interfaces/infrastructure/email-service.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { BaseApplicationService } from '../base/base.application.service';

// Matches the verification code's 24 h lifetime in SignupService.
const VERIFICATION_EMAIL_TTL_SECONDS = 24 * 60 * 60;

/**
 * Orchestrates user registration across the two independent aggregates a new User depends on
 * (default UserGroup, default Role) in a single transaction, then delegates the actual write to
 * UserService — which no longer resolves either default itself.
 *
 * @extends BaseApplicationService
 */
export class SignupApplicationService extends BaseApplicationService {
  private signupService: SignupService;
  private userService: UserService;
  private userGroupService: UserGroupService;
  private roleService: RoleService;
  private emailService: IEmailService;
  private logger: ILogger;

  constructor(
    database_mapper: IDatabaseMapper,
    signupService: SignupService,
    userService: UserService,
    userGroupService: UserGroupService,
    roleService: RoleService,
    emailService: IEmailService,
    logger: ILogger,
  ) {
    super(database_mapper);
    this.signupService = signupService;
    this.userService = userService;
    this.userGroupService = userGroupService;
    this.roleService = roleService;
    this.emailService = emailService;
    this.logger = logger;
  }

  /**
   * Queue a verification-code email, swallowing and logging any failure to queue it so it never
   * fails the caller's registration/resend operation.
   *
   * @param {string} userId - The id of the user the email is sent to.
   * @param {string} email - The recipient's email address.
   * @param {string} rawCode - The raw (unhashed) verification code to deliver.
   * @returns {Promise<void>}
   */
  private async sendVerificationEmail(userId: string, email: string, rawCode: string): Promise<void> {
    try {
      await this.emailService.enqueueEmail(
        new NewEmail({
          user_id: userId,
          to: [email],
          subject: 'Verify your email',
          body: `Your verification code is: ${rawCode}`,
          status: 'pending',
          ttl: VERIFICATION_EMAIL_TTL_SECONDS,
        }),
      );
    } catch (error) {
      this.logger.logError('Failed to queue verification email', { email, error });
    }
  }

  /**
   * Register a new user, assigning the default user group and default role server-side, and
   * issue an email verification code for the new account.
   *
   * @param {INewUser} userData - User registration data. Any `ug_id`/`role_id` supplied by the
   * caller is ignored — both are always resolved to the current defaults.
   * @param {boolean} [sendEmail=true] - Whether to send the verification email; pass `false` for
   * non-interactive registrations (e.g. database seeding) that use placeholder addresses.
   * @returns {Promise<{ id: string; status: string }>} The created user's id and status.
   * @throws {DomainServiceError} UNKNOWN_ERROR when no default user group or default role is available.
   * @throws {DomainServiceError} ALREADY_EXISTS when the email is already associated with another account.
   */
  async register(userData: INewUser, sendEmail: boolean = true): Promise<{ id: string; status: string }> {
    const { id, status, email, rawCode } = await this.dbTransaction(async ({ session }) => {
      const defaultUserGroup = await this.userGroupService.getDefaultGroup({ session });
      if (!defaultUserGroup) {
        throw new DomainServiceError('No default user group is available', 'UNKNOWN_ERROR');
      }

      const defaultRole = await this.roleService.getDefaultRole({ session });
      if (!defaultRole) {
        throw new DomainServiceError('No default role is available', 'UNKNOWN_ERROR');
      }
      const createdUser = await this.userService.create(
        { ...userData, ug_id: defaultUserGroup.id, role_id: defaultRole.id, status: 'pending_verification' },
        { session },
      );

      const { rawCode } = await this.signupService.createVerificationCode(createdUser.id, createdUser.email, {
        session,
      });

      return { id: createdUser.id, status: createdUser.status, email: createdUser.email, rawCode };
    });

    // Queueing the email is deliberately outside the transaction — a queue failure must never
    // roll back a successful registration or code generation.
    if (sendEmail) {
      await this.sendVerificationEmail(id, email, rawCode);
    }

    return { id, status };
  }

  /**
   * Verify a user's email using a previously issued verification code, and activate their account.
   *
   * @param {string} email - The user's email.
   * @param {string} code - The raw verification code presented by the user.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given email, or no matching pending
   * code is found.
   * @throws {DomainServiceError} VALIDATION_ERROR when the matching code has expired.
   */
  async verifyEmail(email: string, code: string): Promise<void> {
    return this.signupService.verifyEmail(email, code);
  }

  /**
   * Request a fresh email verification code for an already-registered, not-yet-verified user.
   *
   * @param {string} email - The user's email.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} NOT_FOUND when no user exists with the given email.
   * @throws {DomainServiceError} INVALID_OPERATION when the user's email is already verified.
   */
  async resendVerificationCode(email: string): Promise<void> {
    const { userId, rawCode } = await this.signupService.resendVerificationCode(email);
    await this.sendVerificationEmail(userId, email, rawCode);
  }
}

export default SignupApplicationService;
