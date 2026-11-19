/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 *
 * Integration tests for the unique indexes the schemas declare, against a real MongoDB database of their own.
 * Each rule a domain service checks before writing is also enforced here, so a lost race fails instead of
 * writing a duplicate.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import { Types } from 'mongoose';

import { NewEmailVerificationCode } from '@/domain/auth/models/email-verification-code';
import { NewLoginRecord } from '@/domain/auth/models/login-record';
import { NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';
import { NewResource } from '@/domain/auth/models/resource';
import { NewRole } from '@/domain/auth/models/role';
import { NewUser } from '@/domain/user/models/user';
import { NewUserGroup } from '@/domain/user/models/user-group';

import { EmailVerificationCodeModel } from './auth/email-verification-code.model';
import { EmailVerificationCodeRepository } from './auth/email-verification-code.repository';
import { LoginRecordModel } from './auth/login-record.model';
import { LoginRecordRepository } from './auth/login-record.repository';
import { PasswordResetCodeModel } from './auth/password-reset-code.model';
import { PasswordResetCodeRepository } from './auth/password-reset-code.repository';
import {
  clearTestDB,
  connectToTestDB,
  disconnectFromTestDB,
  dropTestDB,
} from './base/test-helpers/mongodb-test-helper';
import { ResourceModel } from './resources/resource.model';
import { ResourceRepository } from './resources/resource.repository';
import { RoleModel } from './roles/role.model';
import { RoleRepository } from './roles/role.repository';
import { UserGroupModel } from './user-groups/user-group.model';
import { UserGroupRepository } from './user-groups/user-group.repository';
import { UserModel } from './user/user.model';
import { UserRepository } from './user/user.repository';

const VALID_TILL = new Date(Date.now() + 60 * 60 * 1000);

/**
 * Run two writes at the same time and return what each settled to.
 *
 * @param {() => Promise<unknown>} first - The first write.
 * @param {() => Promise<unknown>} second - The second write.
 * @returns {Promise<{ fulfilled: number; reasons: unknown[] }>} How many succeeded, and why the others failed.
 */
async function race(
  first: () => Promise<unknown>,
  second: () => Promise<unknown>,
): Promise<{ fulfilled: number; reasons: unknown[] }> {
  const results = await Promise.allSettled([first(), second()]);
  return {
    fulfilled: results.filter((result) => result.status === 'fulfilled').length,
    reasons: results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((r) => r.reason),
  };
}

describe('Unique indexes', () => {
  beforeAll(async () => {
    await connectToTestDB('infinite-node-application-test-unique-indexes');
    // The indexes must exist before a test relies on them; init() resolves once they are built.
    await Promise.all(
      [
        UserModel,
        RoleModel,
        ResourceModel,
        UserGroupModel,
        EmailVerificationCodeModel,
        PasswordResetCodeModel,
        LoginRecordModel,
      ].map((model) => model.init()),
    );
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await dropTestDB();
    await disconnectFromTestDB();
  });

  describe('users.email', () => {
    const repository = new UserRepository();
    const user = (email: string): NewUser =>
      new NewUser({
        email,
        password: 'hash',
        status: 'pending_verification',
        ug_id: 'group-1',
        role_id: new Types.ObjectId().toString(),
      });

    it('lets one of two concurrent creates with the same email win; the other fails with DUPLICATE_KEY', async () => {
      const { fulfilled, reasons } = await race(
        () => repository.create(user('jane@example.com')),
        () => repository.create(user('jane@example.com')),
      );

      expect(fulfilled).toBe(1);
      expect(reasons).toEqual([expect.objectContaining({ name: 'RepositoryError', type: 'DUPLICATE_KEY' })]);
      expect(await UserModel.countDocuments()).toBe(1);
    });

    it('rejects an email that differs only in case or surrounding spaces, since emails are stored normalized', async () => {
      await repository.create(user('jane@example.com'));

      await expect(repository.create(user(' Jane@Example.com'))).rejects.toMatchObject({ type: 'DUPLICATE_KEY' });
    });
  });

  describe('roles', () => {
    const repository = new RoleRepository();
    const role = (name: string, isDefault: boolean): NewRole =>
      new NewRole({ name, default: isDefault, resource_permissions: [] });

    it('rejects a second role with the same name', async () => {
      await repository.create(role('Editor', false));

      await expect(repository.create(role('Editor', false))).rejects.toMatchObject({ type: 'DUPLICATE_KEY' });
    });

    it('allows only one default role', async () => {
      const { fulfilled, reasons } = await race(
        () => repository.create(role('Member', true)),
        () => repository.create(role('Guest', true)),
      );

      expect(fulfilled).toBe(1);
      expect(reasons).toEqual([expect.objectContaining({ type: 'DUPLICATE_KEY' })]);
    });

    it('allows any number of non-default roles', async () => {
      await repository.create(role('Member', true));
      await repository.create(role('Editor', false));
      await repository.create(role('Viewer', false));

      expect(await RoleModel.countDocuments({ default: false })).toBe(2);
    });

    it('allows switching the default when the old default is unset first', async () => {
      const member = await repository.create(role('Member', true));
      const editor = await repository.create(role('Editor', false));

      member.default = false;
      await repository.update(member.id, member);
      editor.default = true;

      await expect(repository.update(editor.id, editor)).resolves.toMatchObject({ default: true, version: 1 });
    });
  });

  describe('resources.name', () => {
    it('rejects a second resource with the same name', async () => {
      const repository = new ResourceRepository();
      await repository.create(new NewResource({ name: 'email-logs' }));

      await expect(repository.create(new NewResource({ name: 'email-logs' }))).rejects.toMatchObject({
        type: 'DUPLICATE_KEY',
      });
    });
  });

  describe('user-groups', () => {
    const repository = new UserGroupRepository();
    const group = (name: string, isDefault: boolean): NewUserGroup =>
      new NewUserGroup({ name, description: name, discount: 0, default: isDefault });

    it('rejects a second group with the same name', async () => {
      await repository.create(group('VIP', false));

      await expect(repository.create(group('VIP', false))).rejects.toMatchObject({ type: 'DUPLICATE_KEY' });
    });

    it('allows only one default group, and any number of non-default ones', async () => {
      await repository.create(group('Default', true));
      await repository.create(group('VIP', false));
      await repository.create(group('Premium', false));

      await expect(repository.create(group('Other default', true))).rejects.toMatchObject({ type: 'DUPLICATE_KEY' });
    });
  });

  describe('email_verification_codes: one pending code per email', () => {
    const repository = new EmailVerificationCodeRepository();
    const code = (status: 'pending' | 'expired'): NewEmailVerificationCode =>
      new NewEmailVerificationCode({
        user_id: new Types.ObjectId().toString(),
        email: 'jane@example.com',
        code: new Types.ObjectId().toString(),
        status,
        valid_till: VALID_TILL,
      });

    it('rejects a second pending code for the same email', async () => {
      const { fulfilled, reasons } = await race(
        () => repository.create(code('pending')),
        () => repository.create(code('pending')),
      );

      expect(fulfilled).toBe(1);
      expect(reasons).toEqual([expect.objectContaining({ type: 'DUPLICATE_KEY' })]);
    });

    it('allows a pending code next to expired ones', async () => {
      await repository.create(code('expired'));
      await repository.create(code('expired'));

      await expect(repository.create(code('pending'))).resolves.toMatchObject({ status: 'pending' });
    });
  });

  describe('password_reset_codes: one active code per email', () => {
    const repository = new PasswordResetCodeRepository();
    const code = (status: 'active' | 'cancelled'): NewPasswordResetCode =>
      new NewPasswordResetCode({ email: 'jane@example.com', code: 'abc123', valid_till: VALID_TILL, status });

    it('rejects a second active code for the same email', async () => {
      await repository.create(code('active'));

      await expect(repository.create(code('active'))).rejects.toMatchObject({ type: 'DUPLICATE_KEY' });
    });

    it('allows an active code next to cancelled ones', async () => {
      await repository.create(code('cancelled'));
      await repository.create(code('cancelled'));

      await expect(repository.create(code('active'))).resolves.toMatchObject({ status: 'active' });
    });
  });

  describe('login_records.token', () => {
    it('rejects a second login record with the same token', async () => {
      const repository = new LoginRecordRepository();
      const record = (): NewLoginRecord =>
        new NewLoginRecord({
          user_id: 'user-1',
          token: 'token-hash',
          refresh_token: new Types.ObjectId().toString(),
          access_token_valid_till: VALID_TILL,
          refresh_token_valid_till: VALID_TILL,
          status: 'active',
        });
      await repository.create(record());

      await expect(repository.create(record())).rejects.toMatchObject({ type: 'DUPLICATE_KEY' });
    });
  });
});
