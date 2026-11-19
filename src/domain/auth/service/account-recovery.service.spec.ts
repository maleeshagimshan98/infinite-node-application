/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import { User } from '@/domain/user/models/user';
import { UserService } from '@/domain/user/service/user.service';
import { PasswordResetCode, type NewPasswordResetCode } from '@/domain/auth/models/password-reset-code';
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
    service = new AccountRecoveryService(userService, passwordResetCodeRepository, mockRepository());
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
});
