/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import { AccountRecoveryService } from '@/domain/auth/service/account-recovery.service';
import { LoginService } from '@/domain/auth/service/login.service';
import { LoginRecord } from '@/domain/auth/models/login-record';
import { UserService } from '@/domain/user/service/user.service';
import { User } from '@/domain/user/models/user';
import { NewPasswordResetCode, PasswordResetCode } from '@/domain/auth/models/password-reset-code';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { ICache, IDatabaseMapper, IEmailService, ILogger } from '@/application/interfaces';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IPasswordResetCodeRepository } from '@/application/interfaces/repositories/auth/password-reset-code.repository.interface';

import { AccountRecoveryApplicationService } from './account-recovery.application.service';
import { LoginApplicationService } from './login.application.service';

const USER_ID = '65f1a2b3c4d5e6f708192a3b';
const EMAIL = 'jane.doe@example.com';
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

describe('AccountRecoveryApplicationService', () => {
  let databaseMapper: jest.Mocked<IDatabaseMapper>;
  let emailService: jest.Mocked<IEmailService>;
  let logger: jest.Mocked<ILogger>;
  let userService: UserService;
  let passwordResetCodeRepository: jest.Mocked<IPasswordResetCodeRepository>;
  let accountRecoveryService: AccountRecoveryService;
  let loginApplicationService: LoginApplicationService;
  let service: AccountRecoveryApplicationService;

  beforeEach(() => {
    databaseMapper = {
      serviceName: jest.fn(() => 'database_mapper' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      mapper: jest.fn(),
      transaction: jest.fn(),
    };
    databaseMapper.transaction.mockImplementation((callback) => callback({ session: SESSION }));
    emailService = {
      serviceName: jest.fn(() => 'emailService' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      sendEmail: jest.fn(),
      emailQueueName: jest.fn(),
      enqueueEmail: jest.fn(),
      deliverQueuedEmail: jest.fn(),
    };
    logger = {
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
    passwordResetCodeRepository = mockRepository();
    const loginService = new LoginService(mockRepository(), mockRepository());
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
    accountRecoveryService = new AccountRecoveryService(userService, passwordResetCodeRepository, loginService);
    loginApplicationService = new LoginApplicationService(databaseMapper, loginService, userService, cache, logger);
    service = new AccountRecoveryApplicationService(
      databaseMapper,
      accountRecoveryService,
      loginApplicationService,
      emailService,
      logger,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('issues the reset code in a transaction and emails the raw code whose hash was stored', async () => {
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

    await service.forgotPassword('Jane.Doe@Example.com');

    expect(databaseMapper.transaction).toHaveBeenCalledTimes(1);
    expect(passwordResetCodeRepository.create).toHaveBeenCalledWith(expect.any(NewPasswordResetCode), {
      session: SESSION,
    });
    const storedCode = passwordResetCodeRepository.create.mock.calls[0]?.[0].code;
    const email = emailService.enqueueEmail.mock.calls[0]?.[0];
    const rawCode = email?.body.match(/^Your password reset code is: ([0-9a-f]{64})$/)?.[1] ?? '';
    expect(rawCode).not.toBe('');
    expect(storedCode).toBe(crypto.createHash('sha256').update(rawCode).digest('hex'));
    expect(email?.user_id).toBe(USER_ID);
    expect(email?.to).toEqual([EMAIL]);
    expect(email?.status).toBe('pending');
    expect(email?.ttl).toBe(30 * 60);
  });

  it('logs a failure to queue the email without failing the request', async () => {
    jest.spyOn(accountRecoveryService, 'forgotPassword').mockResolvedValue({
      userId: USER_ID,
      email: EMAIL,
      rawCode: 'code-1',
    });
    emailService.enqueueEmail.mockRejectedValue(new Error('queue down'));

    await expect(service.forgotPassword(EMAIL)).resolves.toBeUndefined();
    expect(logger.logError).toHaveBeenCalledWith(
      'Failed to queue password reset email',
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it('queues no email when the reset code cannot be issued', async () => {
    jest
      .spyOn(accountRecoveryService, 'forgotPassword')
      .mockRejectedValue(new DomainServiceError('The User could not be found.', 'NOT_FOUND'));

    await expect(service.forgotPassword(EMAIL)).rejects.toMatchObject({ type: 'NOT_FOUND' });
    expect(emailService.enqueueEmail).not.toHaveBeenCalled();
  });

  it('resets the password in a transaction and evicts the revoked sessions after it commits', async () => {
    const revoked = [
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
    const order: string[] = [];
    databaseMapper.transaction.mockImplementation(async (callback) => {
      const result = await callback({ session: SESSION });
      order.push('commit');
      return result;
    });
    const reset = jest.spyOn(accountRecoveryService, 'resetPassword').mockResolvedValue(revoked);
    const evict = jest.spyOn(loginApplicationService, 'evictLoginRecords').mockImplementation(async () => {
      order.push('evict');
    });

    await service.resetPassword(EMAIL, 'raw-code', 'new-password');

    expect(reset).toHaveBeenCalledWith(EMAIL, 'raw-code', 'new-password', { session: SESSION });
    expect(evict).toHaveBeenCalledWith(revoked);
    expect(order).toEqual(['commit', 'evict']);
  });

  it('evicts nothing when the reset fails', async () => {
    jest
      .spyOn(accountRecoveryService, 'resetPassword')
      .mockRejectedValue(new DomainServiceError('The reset code has expired.', 'VALIDATION_ERROR'));
    const evict = jest.spyOn(loginApplicationService, 'evictLoginRecords');

    await expect(service.resetPassword(EMAIL, 'raw-code', 'new-password')).rejects.toMatchObject({
      type: 'VALIDATION_ERROR',
    });
    expect(evict).not.toHaveBeenCalled();
  });
});
