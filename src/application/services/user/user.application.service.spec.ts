/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { User } from '@/domain/user/models/user';
import { LoginRecord } from '@/domain/auth/models/login-record';
import { UserService } from '@/domain/user/service/user.service';
import { LoginService } from '@/domain/auth/service/login.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { IUser, INewUser } from '@/domain/user/models/user';
import type { ICache, IDatabaseMapper, ILogger } from '@/application/interfaces';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import { LoginApplicationService } from '@/application/services/auth/login.application.service';

import { UserApplicationService } from './user.application.service';

const USER_ID = '65f1a2b3c4d5e6f708192a3b';
const SESSION = 'session-1';

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
 * Build the user as UserService.update() returns it.
 *
 * @param {Partial<IUser>} [overrides] - Fields to change from an active user at version 5.
 * @returns {User} The user.
 */
function user(overrides: Partial<IUser> = {}): User {
  return new User({
    id: USER_ID,
    version: 5,
    email: 'jane@example.com',
    password: 'hash',
    status: 'active',
    ug_id: 'group-1',
    role_id: 'role-1',
    ...overrides,
  });
}

describe('UserApplicationService.update', () => {
  let databaseMapper: jest.Mocked<IDatabaseMapper>;
  let userService: UserService;
  let loginService: LoginService;
  let loginApplicationService: LoginApplicationService;
  let service: UserApplicationService;
  let revoked: LoginRecord[];
  let order: string[];

  beforeEach(() => {
    order = [];
    databaseMapper = {
      serviceName: jest.fn(() => 'database_mapper' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      mapper: jest.fn(),
      transaction: jest.fn(),
    };
    databaseMapper.transaction.mockImplementation(async (callback) => {
      const result = await callback({ session: SESSION });
      order.push('commit');
      return result;
    });
    const cache: jest.Mocked<ICache> = {
      serviceName: jest.fn(() => 'cache' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      hSet: jest.fn(),
      hGet: jest.fn(),
      hGetAll: jest.fn(),
      hDel: jest.fn(),
      hExists: jest.fn(),
    };
    const logger: jest.Mocked<ILogger> = {
      serviceName: jest.fn(() => 'logger' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
      logWarn: jest.fn(),
    };
    userService = new UserService(mockRepository(), mockRepository(), mockRepository());
    loginService = new LoginService(mockRepository(), mockRepository());
    loginApplicationService = new LoginApplicationService(databaseMapper, loginService, userService, cache, logger);
    service = new UserApplicationService(databaseMapper, userService, loginService, loginApplicationService);

    revoked = [
      new LoginRecord({
        id: '65f1a2b3c4d5e6f708192a51',
        version: 1,
        user_id: USER_ID,
        token: 'token-hash-1',
        refresh_token: 'refresh-hash-1',
        access_token_valid_till: new Date(),
        refresh_token_valid_till: new Date(),
        status: 'revoked',
      }),
    ];
    jest.spyOn(loginService, 'revokeAllForUser').mockResolvedValue(revoked);
    jest.spyOn(loginApplicationService, 'evictLoginRecords').mockImplementation(async () => {
      order.push('evict');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each<[string, Partial<INewUser>, Partial<IUser>]>([
    ['a new password', { password: 'new-password', version: 5 }, {}],
    ['a suspension', { status: 'suspended', version: 5 }, { status: 'suspended' }],
    ['a status back to pending verification', { status: 'pending_verification' }, { status: 'pending_verification' }],
  ])(
    'revokes every session on %s in the same transaction, then evicts them after the commit',
    async (_case, data, after) => {
      jest.spyOn(userService, 'update').mockResolvedValue(user({ version: 6, ...after }));

      const updated = await service.update(USER_ID, data);

      expect(updated.version).toBe(6);
      expect(userService.update).toHaveBeenCalledWith(USER_ID, data, { session: SESSION });
      expect(loginService.revokeAllForUser).toHaveBeenCalledWith(USER_ID, { session: SESSION });
      expect(loginApplicationService.evictLoginRecords).toHaveBeenCalledWith(revoked);
      expect(order).toEqual(['commit', 'evict']);
    },
  );

  it.each<[string, Partial<INewUser>]>([
    ['an email change', { email: 'new@example.com', version: 5 }],
    ['a status set to active', { status: 'active', version: 5 }],
  ])('keeps the sessions on %s', async (_case, data) => {
    jest.spyOn(userService, 'update').mockResolvedValue(user({ version: 6 }));

    await service.update(USER_ID, data);

    expect(loginService.revokeAllForUser).not.toHaveBeenCalled();
    expect(loginApplicationService.evictLoginRecords).toHaveBeenCalledWith([]);
  });

  it('evicts nothing when the update fails', async () => {
    jest
      .spyOn(userService, 'update')
      .mockRejectedValue(new DomainServiceError('The User was changed by another request.', 'CONFLICT'));

    await expect(service.update(USER_ID, { password: 'new-password', version: 4 })).rejects.toMatchObject({
      type: 'CONFLICT',
    });
    expect(loginApplicationService.evictLoginRecords).not.toHaveBeenCalled();
  });
});
