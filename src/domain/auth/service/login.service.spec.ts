/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import argon2 from 'argon2';

import { LoginRecord } from '@/domain/auth/models/login-record';
import { User } from '@/domain/user/models/user';
import type { IUser } from '@/domain/user/models/user';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { ILoginRecordRepository } from '@/application/interfaces/repositories/auth/login-record.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';

import { LoginService } from './login.service';

const USER_ID = '65f1a2b3c4d5e6f708192a3b';
const PASSWORD = 'correct-password';

/**
 * Build a mocked repository with every base method stubbed.
 *
 * @returns {jest.Mocked<IBaseRepository<D, N>>} The mocked repository.
 */
function mockRepository<D extends IVersionedEntity, N>(): jest.Mocked<IBaseRepository<D, N>> {
  return {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

/**
 * Build an active login record of the test user.
 *
 * @param {string} id - The login record id.
 * @returns {LoginRecord} The login record, at version 0.
 */
function loginRecord(id: string): LoginRecord {
  return new LoginRecord({
    id,
    version: 0,
    user_id: USER_ID,
    token: `token-${id}`,
    refresh_token: `refresh-${id}`,
    access_token_valid_till: new Date(Date.now() + 60_000),
    refresh_token_valid_till: new Date(Date.now() + 120_000),
    status: 'active',
  });
}

describe('LoginService', () => {
  let passwordHash: string;
  let userRepository: jest.Mocked<IUserRepository>;
  let loginRecordRepository: jest.Mocked<ILoginRecordRepository>;
  let service: LoginService;

  /**
   * Build the test user with its stored password hash.
   *
   * @param {Partial<IUser>} [overrides] - Fields to change from an active user.
   * @returns {User} The user.
   */
  const user = (overrides: Partial<IUser> = {}): User =>
    new User({
      id: USER_ID,
      version: 0,
      email: 'jane@example.com',
      password: passwordHash,
      status: 'active',
      ug_id: 'group-1',
      role_id: 'role-1',
      ...overrides,
    });

  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  beforeEach(() => {
    userRepository = mockRepository();
    loginRecordRepository = mockRepository();
    service = new LoginService(userRepository, loginRecordRepository);
  });

  describe('revokeAllForUser', () => {
    it('revokes every active session of the user, one at a time, and returns them', async () => {
      const transactionOptions = { session: 'session-1' };
      loginRecordRepository.find.mockResolvedValue([loginRecord('record-1'), loginRecord('record-2')]);
      let inFlight = 0;
      let maxInFlight = 0;
      loginRecordRepository.update.mockImplementation(async (_id, item) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setImmediate(resolve));
        inFlight -= 1;
        return item;
      });

      const revoked = await service.revokeAllForUser(USER_ID, transactionOptions);

      expect(loginRecordRepository.find).toHaveBeenCalledWith(
        { user_id: USER_ID, status: 'active' },
        undefined,
        undefined,
        undefined,
        transactionOptions,
      );
      expect(revoked.map((record) => [record.id, record.status])).toEqual([
        ['record-1', 'revoked'],
        ['record-2', 'revoked'],
      ]);
      expect(loginRecordRepository.update.mock.calls.map(([id, , options]) => [id, options])).toEqual([
        ['record-1', transactionOptions],
        ['record-2', transactionOptions],
      ]);
      expect(maxInFlight).toBe(1);
    });

    it('returns no records when the user has no active session', async () => {
      loginRecordRepository.find.mockResolvedValue([]);

      await expect(service.revokeAllForUser(USER_ID)).resolves.toEqual([]);
      expect(loginRecordRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('suspended users', () => {
    it('refuses to log in a suspended user with the correct password', async () => {
      await expect(service.login(user({ status: 'suspended' }), PASSWORD)).rejects.toMatchObject({
        type: 'AUTHENTICATION_ERROR',
        message: 'This account is suspended',
      });
      expect(loginRecordRepository.create).not.toHaveBeenCalled();
    });

    it('answers a wrong password for a suspended user as invalid credentials, revealing nothing', async () => {
      await expect(service.login(user({ status: 'suspended' }), 'wrong-password')).rejects.toMatchObject({
        type: 'AUTHENTICATION_ERROR',
        message: 'Invalid credentials',
      });
    });

    it('refuses to refresh a session of a suspended user', async () => {
      userRepository.findById.mockResolvedValue(user({ status: 'suspended' }));

      await expect(service.createLoginRecord(USER_ID, 'group-1')).rejects.toMatchObject({
        type: 'AUTHENTICATION_ERROR',
        message: 'This account is suspended',
      });
      expect(loginRecordRepository.create).not.toHaveBeenCalled();
    });

    it('refuses to refresh a session of a user that no longer exists', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.createLoginRecord(USER_ID, 'group-1')).rejects.toMatchObject({
        type: 'AUTHENTICATION_ERROR',
      });
      expect(loginRecordRepository.create).not.toHaveBeenCalled();
    });
  });
});
