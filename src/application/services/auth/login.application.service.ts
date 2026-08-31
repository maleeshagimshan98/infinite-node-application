/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { LoginRecord, type ILoginRecord } from '@/domain/auth/models/login-record';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { LoginService } from '@/domain/auth/service/login.service';
import type { User } from '@/domain/user/models/user';
import type { ICache, IDatabaseMapper, TransactionOptions } from '@/application/interfaces';

import { BaseApplicationService } from '../base/base.application.service';

const INVALID_TOKEN_MESSAGE = 'Authorization token is invalid';
const EXPIRED_TOKEN_MESSAGE = 'Authorization token is expired, login again';

// Redis hash holding all active login records, keyed (field) by the SHA-256 hash of the access token.
const LOGIN_RECORDS_HASH = 'infinite_node_application:login_records';

/**
 * Orchestrates the login lifecycle (login / validate / refresh / logout) and owns the cache layer
 * for login records. Login records are stored as fields of the `login_records` Redis hash, keyed by
 * the SHA-256 hash of the access token (the same value stored on the login record's `token` field),
 * letting the hot validate path skip MongoDB.
 */
export class LoginApplicationService extends BaseApplicationService {
  private loginService: LoginService;
  private cache: ICache;

  constructor(database_mapper: IDatabaseMapper, loginService: LoginService, cache: ICache) {
    super(database_mapper);
    this.loginService = loginService;
    this.cache = cache;
  }

  /**
   * Compute the cache key for a raw access token.
   */
  private cacheKey(token: string): string {
    return this.loginService.hashAccessToken(token);
  }

  /**
   * Reconstruct a LoginRecord from a cached plain object, rehydrating the date fields that JSON
   * serialization flattened to ISO strings.
   */
  private toLoginRecord(cached: ILoginRecord): LoginRecord {
    return new LoginRecord({
      ...cached,
      access_token_valid_till: new Date(cached.access_token_valid_till),
      refresh_token_valid_till: new Date(cached.refresh_token_valid_till),
    });
  }

  /**
   * Persist a login record as a field of the `login_records` hash, keyed by its (already hashed)
   * access token.
   */
  private async cacheLoginRecord(loginRecord: LoginRecord): Promise<void> {
    await this.cache.hSet(LOGIN_RECORDS_HASH, loginRecord.token, loginRecord);
  }

  /**
   * Remove a login record from the `login_records` hash by its raw access token.
   */
  private async evictLoginRecord(token: string): Promise<void> {
    await this.cache.hDel(LOGIN_RECORDS_HASH, this.cacheKey(token));
  }

  /**
   * Resolve a login record for a raw access token, preferring the cache and falling back to the DB.
   */
  private async getRecordCacheOrDb(token: string): Promise<LoginRecord | null> {
    const cached = await this.cache.hGet<ILoginRecord>(LOGIN_RECORDS_HASH, this.cacheKey(token));
    if (cached) {
      return this.toLoginRecord(cached);
    }
    return this.loginService.getLoginRecordByToken(token);
  }

  private authError(message: string): DomainServiceError {
    return new DomainServiceError(message, 'AUTHENTICATION_ERROR');
  }

  /**
   * Run a login-record state mutation (expire/revoke) that may target a record whose cached copy
   * outlived its database row. If the record no longer exists, the mutation now fails with a
   * NOT_FOUND domain error; surface it as an authentication error so the failed update is visible
   * to the caller instead of passing silently. Any other error propagates unchanged.
   */
  private async mutateLoginRecord(op: () => Promise<void>): Promise<void> {
    try {
      await op();
    } catch (e: unknown) {
      if (e instanceof DomainServiceError && e.type === 'NOT_FOUND') {
        throw this.authError(INVALID_TOKEN_MESSAGE);
      }
      throw e;
    }
  }

  /**
   * Fetch a user by id. Thin delegation so callers (e.g. middleware) need only this service.
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.loginService.getUserById(userId);
  }

  /**
   * Authenticate a user and cache the resulting login record.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ id: string; status: string; accessToken: string; refreshToken: string }> {
    const result = await this.loginService.login(email, password);
    await this.cacheLoginRecord(result.loginRecord);

    return {
      id: result.id,
      status: result.status,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * Validate an access token, using the cached login record when available.
   */
  async validate(token: string): Promise<{ id: string; status: string; groups: string }> {
    const identity = await this.loginService.validateToken(token);

    const record = await this.getRecordCacheOrDb(token);
    if (!record) {
      throw this.authError(INVALID_TOKEN_MESSAGE);
    }

    if (record.isExpired()) {
      await this.evictLoginRecord(token);
      await this.mutateLoginRecord(() => this.loginService.expireLoginRecord(record));
      throw this.authError(EXPIRED_TOKEN_MESSAGE);
    }

    return { id: identity.id, status: record.status, groups: identity.groups };
  }

  /**
   * Rotate an access/refresh token pair: expire the current session and issue a new one.
   */
  async refresh(accessToken: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const identity = await this.loginService.validateToken(accessToken);

    const record = await this.getRecordCacheOrDb(accessToken);
    if (!record) {
      throw this.authError(INVALID_TOKEN_MESSAGE);
    }

    if (!this.loginService.isRefreshTokenValid(record, refreshToken)) {
      await this.evictLoginRecord(accessToken);
      await this.mutateLoginRecord(() => this.loginService.expireLoginRecord(record));
      throw this.authError(EXPIRED_TOKEN_MESSAGE);
    }

    const next = await this.dbTransaction(async (session: TransactionOptions) => {
      await this.mutateLoginRecord(() => this.loginService.expireLoginRecord(record, session));
      return this.loginService.createLoginRecord(identity.id, identity.groups, session);
    });

    await this.evictLoginRecord(accessToken);
    await this.cacheLoginRecord(next.loginRecord);

    return { accessToken: next.accessToken, refreshToken: next.refreshToken };
  }

  /**
   * Revoke an active login session and drop it from the cache.
   */
  async logout(token: string): Promise<void> {
    await this.loginService.validateToken(token);

    const record = await this.getRecordCacheOrDb(token);
    if (!record) {
      throw this.authError(INVALID_TOKEN_MESSAGE);
    }

    if (record.isExpired()) {
      throw this.authError(EXPIRED_TOKEN_MESSAGE);
    }

    await this.evictLoginRecord(token);
    await this.mutateLoginRecord(() => this.loginService.revokeLoginRecord(record));
  }
}

export default LoginApplicationService;
