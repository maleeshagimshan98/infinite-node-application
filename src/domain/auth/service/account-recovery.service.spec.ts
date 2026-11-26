/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import { User } from '@/domain/user/models/user';
import { UserService } from '@/domain/user/service/user.service';
import { PasswordResetCode, type NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';
import { LoginRecord, type NewLoginRecord } from '@/domain/auth/models/login-record';
import { LoginService } from '@/domain/auth/service/login.service';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IPasswordResetCodeRepository } from '@/application/interfaces/repositories/auth/password-reset-code.repository.interface';

import { AccountRecoveryService } from './account-recovery.service';

const USER_ID = '65f1a2b3c4d5e6f708192a3b';
const EMAIL = 'jane.doe@example.com';

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
 * Hash a code the way AccountRecoveryService stores it.
 *
 * @param {string} code - The raw reset code.
 * @returns {string} The SHA-256 hex digest.
 */
function sha256(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

describe('AccountRecoveryService reset codes', () => {
  let userService: UserService;
  let passwordResetCodeRepository: jest.Mocked<IPasswordResetCodeRepository>;
  let loginRecordRepository: jest.Mocked<IBaseRepository<LoginRecord, NewLoginRecord>>;
  let service: AccountRecoveryService;

  beforeEach(() => {
    userService = new UserService(mockRepository(), mockRepository(), mockRepository());
    jest.spyOn(userService, 'getByEmail').mockResolvedValue(
      new User({
        id: USER_ID,
        version: 0,
        email: EMAIL,
        password: 'hash',
        status: 'active',
        ug_id: 'group-1',
        role_id: 'role-1',
      }),
    );
    passwordResetCodeRepository = mockRepository();
    passwordResetCodeRepository.find.mockResolvedValue([]);
    passwordResetCodeRepository.create.mockImplementation(
      async (code: NewPasswordResetCode) =>
        new PasswordResetCode({
          id: '65f1a2b3c4d5e6f708192a3c',
          version: 0,
          email: code.email,
          code: code.code,
          valid_till: code.valid_till,
          status: code.status,
        }),
    );
    loginRecordRepository = mockRepository();
    service = new AccountRecoveryService(
      userService,
      passwordResetCodeRepository,
      new LoginService(mockRepository(), loginRecordRepository),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores only the SHA-256 hash of a random 64-character code', async () => {
    const { rawCode } = await service.forgotPassword(EMAIL);

    expect(rawCode).toMatch(/^[0-9a-f]{64}$/);
    expect(passwordResetCodeRepository.create.mock.calls[0]?.[0].code).toBe(sha256(rawCode));
  });

  it('issues a different code each time', async () => {
    const first = await service.forgotPassword(EMAIL);
    const second = await service.forgotPassword(EMAIL);

    expect(first.rawCode).not.toBe(second.rawCode);
  });

  it('looks a presented code up by its hash', async () => {
    passwordResetCodeRepository.findOne.mockResolvedValue(null);

    await expect(service.resetPassword(EMAIL, 'raw-code', 'new-password')).rejects.toMatchObject({
      type: 'NOT_FOUND',
    });
    expect(passwordResetCodeRepository.findOne).toHaveBeenCalledWith(
      { email: EMAIL, code: sha256('raw-code'), status: 'active' },
      {},
      undefined,
    );
  });

  it('cancels the old reset codes one at a time', async () => {
    passwordResetCodeRepository.find.mockResolvedValue([
      resetCode('65f1a2b3c4d5e6f708192a41'),
      resetCode('65f1a2b3c4d5e6f708192a42'),
    ]);
    let releaseFirst: () => void = () => undefined;
    passwordResetCodeRepository.update
      .mockImplementationOnce(
        (_id, item) =>
          new Promise<PasswordResetCode>((resolve) => {
            releaseFirst = (): void => resolve(item);
          }),
      )
      .mockImplementationOnce(async (_id, item) => item);

    const cancelling = service.cancelOldResetCodes(EMAIL, { session: 'session-1' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(passwordResetCodeRepository.update).toHaveBeenCalledTimes(1);

    releaseFirst();
    await cancelling;
    expect(passwordResetCodeRepository.update).toHaveBeenCalledTimes(2);
  });

  it('revokes every active login session of the user and returns the revoked records', async () => {
    const code = resetCode('65f1a2b3c4d5e6f708192a43');
    passwordResetCodeRepository.findOne.mockResolvedValue(code);
    passwordResetCodeRepository.update.mockImplementation(async (_id, item) => item);
    jest.spyOn(userService, 'update').mockResolvedValue(
      new User({
        id: USER_ID,
        version: 1,
        email: EMAIL,
        password: 'new-hash',
        status: 'active',
        ug_id: 'group-1',
        role_id: 'role-1',
      }),
    );
    const sessions = [loginRecord('65f1a2b3c4d5e6f708192a51'), loginRecord('65f1a2b3c4d5e6f708192a52')];
    loginRecordRepository.find.mockResolvedValue(sessions);
    loginRecordRepository.update.mockImplementation(async (_id, item) => item);

    const revoked = await service.resetPassword(EMAIL, 'raw-code', 'new-password', { session: 'session-1' });

    expect(loginRecordRepository.find).toHaveBeenCalledWith(
      { user_id: USER_ID, status: 'active' },
      undefined,
      undefined,
      undefined,
      { session: 'session-1' },
    );
    expect(revoked.map((record) => [record.id, record.status])).toEqual([
      ['65f1a2b3c4d5e6f708192a51', 'revoked'],
      ['65f1a2b3c4d5e6f708192a52', 'revoked'],
    ]);
    expect(loginRecordRepository.update).toHaveBeenCalledTimes(2);
  });
});

/**
 * Build an active, unexpired reset code for the test user.
 *
 * @param {string} id - The reset code id.
 * @returns {PasswordResetCode} The reset code.
 */
function resetCode(id: string): PasswordResetCode {
  return new PasswordResetCode({
    id,
    version: 0,
    email: EMAIL,
    code: sha256('raw-code'),
    valid_till: new Date(Date.now() + 60_000),
    status: 'active',
  });
}

/**
 * Build an active login record of the test user.
 *
 * @param {string} id - The login record id.
 * @returns {LoginRecord} The login record.
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
