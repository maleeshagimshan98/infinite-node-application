/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { User } from '@/domain/user/models/user';
import type { UserService } from '@/domain/user/service/user.service';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

export class SignupService extends BaseDomainService {
  /**
   * User service instance
   *
   * @private
   */
  private readonly userService: UserService;

  constructor(userService: UserService) {
    super();
    this.userService = userService;
  }

  /**
   * Verify user email and activate account
   *
   * @param {string} email - User email
   * @param {TransactionOptions | undefined} transactionOptions - Transaction options for database operations
   * @returns {Promise<void>}
   * @throws {DomainServiceError}
   */
  async verifyEmail(email: string, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      const user: User | null = await this.userService.getByEmail(email, transactionOptions);

      if (!user) {
        throw new DomainServiceError(`The User with the email equal to ${email} could not be found.`, 'NOT_FOUND');
      }

      if (!user.isActive()) {
        user.activate();
        // Pass only the changed field — UserService.update() re-hashes `password` whenever it's
        // present in the payload, and `user.password` here already holds the stored hash.
        await this.userService.update(user.id, { status: user.status }, transactionOptions);
      }
    });
  }
}

export default SignupService;
