/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { LoginRecord } from '@/domain/auth/models/login-record';
import { LoginService } from '@/domain/auth/service/login.service';
import { UserService } from '@/domain/user/service/user.service';
import type { ICache, IDatabaseMapper, ILogger } from '@/application/interfaces';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { ILoginRecordRepository } from '@/application/interfaces/repositories/auth/login-record.repository.interface';
import { RepositoryError } from '@/application/interfaces/errors/repository.error';
import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';

import { LoginApplicationService } from './login.application.service';

const USER_ID = '65f1a2b3c4d5e6f708192a3b';
const RECORD_ID = '65f1a2b3c4d5e6f708192a3c';
const LOGIN_RECORDS_HASH = 'infinite_node_application:login_records';
const HOUR_MS = 60 * 60 * 1000;

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
 * Hash a token the way LoginService does for the login record and the cache key.
 *
 * @param {string} token - The raw access token.
 * @returns {string} The SHA-256 hex digest.
 */
function sha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('LoginApplicationService', () => {
  let token: string;
  let cache: jest.Mocked<ICache>;
  let loginRecordRepository: jest.Mocked<ILoginRecordRepository>;
  let service: LoginApplicationService;

  /**
   * Build the login record of `token` as the database returns it.
   *
   * @param {number} accessTokenValidForMs - How long the access token stays valid from now; negative when expired.
   * @returns {LoginRecord} The login record at version 0.
   */
  const storedRecord = (accessTokenValidForMs: number): LoginRecord =>
    new LoginRecord({
      id: RECORD_ID,
      version: 0,
      user_id: USER_ID,
      token: sha256(token),
      refresh_token: sha256('refresh-token'),
      access_token_valid_till: new Date(Date.now() + accessTokenValidForMs),
      refresh_token_valid_till: new Date(Date.now() + 24 * HOUR_MS),
      status: 'active',
    });

  beforeAll(() => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;
    token = jwt.sign({ groups: 'group-1' }, privateKey, { algorithm: 'RS256', subject: USER_ID, expiresIn: '1h' });
  });

  afterAll(() => {
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
  });

  beforeEach(() => {
    cache = {
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
    const databaseMapper: jest.Mocked<IDatabaseMapper> = {
      serviceName: jest.fn(() => 'database_mapper' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      mapper: jest.fn(),
      transaction: jest.fn(),
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
    loginRecordRepository = mockRepository();
    const loginService = new LoginService(mockRepository(), loginRecordRepository);
    const userService = new UserService(mockRepository(), mockRepository(), mockRepository());
    service = new LoginApplicationService(databaseMapper, loginService, userService, cache, logger);
  });

  it('uses a cached login record that has a version, without reading the database', async () => {
    cache.hGet.mockResolvedValue(storedRecord(HOUR_MS).toJSON());

    await expect(service.validate(token)).resolves.toEqual({ id: USER_ID, status: 'active', groups: 'group-1' });
    expect(loginRecordRepository.findOne).not.toHaveBeenCalled();
  });

  it('treats a cached login record without a version as a cache miss: evicts it and reads the database', async () => {
    const cachedBeforeRelease = storedRecord(HOUR_MS).toJSON();
    delete cachedBeforeRelease.version;
    cache.hGet.mockResolvedValue(cachedBeforeRelease);
    loginRecordRepository.findOne.mockResolvedValue(storedRecord(HOUR_MS));

    await expect(service.validate(token)).resolves.toEqual({ id: USER_ID, status: 'active', groups: 'group-1' });
    expect(cache.hDel).toHaveBeenCalledWith(LOGIN_RECORDS_HASH, sha256(token));
    expect(loginRecordRepository.findOne).toHaveBeenCalledWith({ token: sha256(token) }, undefined, undefined);
  });

  it('answers a CONFLICT while expiring a login record with an authentication error', async () => {
    cache.hGet.mockResolvedValue(storedRecord(-HOUR_MS).toJSON());
    loginRecordRepository.update.mockRejectedValue(
      new RepositoryError(`login_record.update failed: version 0 of ${RECORD_ID} is stale`, 'VERSION_CONFLICT'),
    );

    await expect(service.validate(token)).rejects.toMatchObject({
      type: 'AUTHENTICATION_ERROR',
      message: 'Authorization token is invalid',
    });
  });

  it('answers a CONFLICT while revoking a login record on logout with an authentication error', async () => {
    cache.hGet.mockResolvedValue(storedRecord(HOUR_MS).toJSON());
    loginRecordRepository.update.mockRejectedValue(
      new RepositoryError(`login_record.update failed: version 0 of ${RECORD_ID} is stale`, 'VERSION_CONFLICT'),
    );

    await expect(service.logout(token)).rejects.toMatchObject({ type: 'AUTHENTICATION_ERROR' });
  });

  it('evicts each revoked login record from the cache by its hashed token', async () => {
    const first = storedRecord(HOUR_MS);
    const second = new LoginRecord({
      id: '65f1a2b3c4d5e6f708192a3d',
      version: 0,
      user_id: USER_ID,
      token: 'other-hash',
      refresh_token: 'other-refresh-hash',
      access_token_valid_till: new Date(Date.now() + HOUR_MS),
      refresh_token_valid_till: new Date(Date.now() + 24 * HOUR_MS),
      status: 'active',
    });

    await service.evictLoginRecords([first, second]);

    expect(cache.hDel.mock.calls).toEqual([
      [LOGIN_RECORDS_HASH, sha256(token)],
      [LOGIN_RECORDS_HASH, 'other-hash'],
    ]);
  });

  it('logs and swallows a cache failure while evicting, so the committed revocation still stands', async () => {
    cache.hDel.mockRejectedValue(new InfrastructureError('Redis is down', 'CACHE_ERROR'));

    await expect(service.evictLoginRecords([storedRecord(HOUR_MS)])).resolves.toBeUndefined();
  });
});
