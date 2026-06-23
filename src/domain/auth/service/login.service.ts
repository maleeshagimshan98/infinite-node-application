/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { NewLoginRecord, type LoginRecord } from '@/domain/auth/models/login-record';
import type { User } from '@/domain/user/models/user';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import type { ILoginRecordRepository } from '@/application/interfaces/repositories/auth/login-record.repository.interface';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export class LoginService extends BaseDomainService {
  private userRepository: IUserRepository;
  private loginRecordRepository: ILoginRecordRepository;

  constructor(userRepository: IUserRepository, loginRecordRepository: ILoginRecordRepository) {
    super();
    this.userRepository = userRepository;
    this.loginRecordRepository = loginRecordRepository;
  }

  /*
   * Hash a token string using SHA-256.
   *
   * @param {string} token - The raw token string to hash.
   * @returns {string}
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /*
   * Sign a JWT access token with the RS256 private key.
   *
   * @param {string} userId - The subject claim (user ID) to embed in the token.
   * @param {string} groups - The user-group ID to embed as the `groups` claim.
   * @returns {string}
   */
  private signJwt(userId: string, groups: string): string {
    const privateKey = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '';
    return jwt.sign({ groups }, privateKey, {
      algorithm: 'RS256',
      subject: userId,
      expiresIn: '1h',
    });
  }

  /*
   * Verify a JWT access token signature using the RS256 public key.
   *
   * Expiration is intentionally ignored: the login record's `access_token_valid_till` is the
   * single source of truth for expiry, so refresh/logout can authenticate a token whose JWT
   * `exp` claim has already lapsed.
   *
   * @param {string} token - The raw JWT string to verify.
   * @returns {jwt.JwtPayload}
   * @throws {Error} — if the token signature is invalid (caught by the caller).
   */
  private verifyJwt(token: string): jwt.JwtPayload {
    const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ?? '';
    return jwt.verify(token, publicKey, { algorithms: ['RS256'], ignoreExpiration: true }) as jwt.JwtPayload;
  }

  /*
   * Generate a cryptographically random refresh token.
   *
   * @returns {string}
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /*
   * Read the refresh token TTL in milliseconds from the environment, defaulting to 7 days.
   *
   * @returns {number}
   */
  private refreshTokenTtlMs(): number {
    return parseInt(process.env.REFRESH_TOKEN_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000), 10);
  }

  /*
   * Issue a fresh access/refresh token pair and persist a new active login record.
   *
   * @param {string} userId - The user the session belongs to.
   * @param {string} groups - The user-group ID to embed in the access token.
   * @param {TransactionOptions} transactionOptions - Optional database transaction session.
   * @returns {Promise<{ accessToken: string; refreshToken: string; loginRecord: LoginRecord }>}
   */
  private async issueTokensAndRecord(
    userId: string,
    groups: string,
    transactionOptions?: TransactionOptions,
  ): Promise<{ accessToken: string; refreshToken: string; loginRecord: LoginRecord }> {
    const accessToken = this.signJwt(userId, groups);
    const refreshToken = this.generateRefreshToken();
    const now = new Date();

    const newRecord = new NewLoginRecord({
      user_id: userId,
      token: this.hashToken(accessToken),
      refresh_token: this.hashToken(refreshToken),
      access_token_valid_till: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS),
      refresh_token_valid_till: new Date(now.getTime() + this.refreshTokenTtlMs()),
      status: 'active',
    });

    const loginRecord = await this.loginRecordRepository.create(newRecord, transactionOptions);

    return { accessToken, refreshToken, loginRecord };
  }

  /*
   * Hash a raw access token into the value used as both the DB lookup key and the cache key.
   *
   * @param {string} token - The raw JWT access token.
   * @returns {string}
   */
  public hashAccessToken(token: string): string {
    return this.hashToken(token);
  }

  /*
   * Fetch a user by their ID from the repository.
   *
   * @param {string} userId - The unique identifier of the user to retrieve.
   * @returns {Promise<User | null>}
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — if a database error occurs.
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.userRepository.findById(userId);
    });
  }

  /*
   * Authenticate a user with email and password and create a new login session.
   *
   * @param {string} email - The user's email address.
   * @param {string} password - The plain-text password to verify against the stored hash.
   * @param {TransactionOptions} transactionOptions - Optional database transaction session.
   * @returns {Promise<{ id: string; status: string; accessToken: string; refreshToken: string; loginRecord: LoginRecord }>}
   * @throws {DomainServiceError} AUTHENTICATION_ERROR — if credentials are invalid.
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — if a database error occurs.
   */
  async login(
    email: string,
    password: string,
    transactionOptions?: TransactionOptions,
  ): Promise<{ id: string; status: string; accessToken: string; refreshToken: string; loginRecord: LoginRecord }> {
    return this.wrapInfrastructureErrors(async () => {
      const user = await this.userRepository.findOne({ email });

      if (!user) {
        throw new DomainServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
      }

      const isPasswordMatching = await argon2.verify(user.password, password);
      if (!isPasswordMatching) {
        throw new DomainServiceError('Invalid credentials', 'AUTHENTICATION_ERROR');
      }

      const { accessToken, refreshToken, loginRecord } = await this.issueTokensAndRecord(
        user.id,
        user.ug_id,
        transactionOptions,
      );

      return {
        id: user.id,
        status: user.status,
        accessToken,
        refreshToken,
        loginRecord,
      };
    });
  }

  /*
   * Validate an access token's authenticity by verifying its RS256 signature.
   *
   * This performs no database lookup, status, or expiry check — those belong to the application
   * service (cache/DB lookup) and the login record (`access_token_valid_till`). Expiry is
   * deliberately ignored here so a clock-expired token can still be authenticated for refresh.
   *
   * @param {string} token - The raw JWT access token to validate.
   * @returns {Promise<{ id: string; groups: string }>}
   * @throws {DomainServiceError} AUTHENTICATION_ERROR — if the token is missing or its signature is invalid.
   */
  async validateToken(token: string): Promise<{ id: string; groups: string }> {
    if (!token) {
      throw new DomainServiceError('Authorization token is missing', 'AUTHENTICATION_ERROR');
    }

    let payload: jwt.JwtPayload;
    try {
      payload = this.verifyJwt(token);
    } catch {
      throw new DomainServiceError('Authorization token is invalid', 'AUTHENTICATION_ERROR');
    }

    return { id: payload.sub ?? '', groups: payload['groups'] ?? '' };
  }

  /*
   * Look up a login record by the hash of its raw access token.
   *
   * @param {string} token - The raw JWT access token.
   * @param {TransactionOptions} transactionOptions - Optional database transaction session.
   * @returns {Promise<LoginRecord | null>}
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — if a database error occurs.
   */
  async getLoginRecordByToken(token: string, transactionOptions?: TransactionOptions): Promise<LoginRecord | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.loginRecordRepository.findOne({ token: this.hashToken(token) }, undefined, transactionOptions);
    });
  }

  /*
   * Determine whether the access token tied to a login record is expired.
   *
   * @param {LoginRecord} loginRecord - The login record to evaluate.
   * @returns {boolean}
   */
  isAccessTokenExpired(loginRecord: LoginRecord): boolean {
    return loginRecord.status !== 'active' || loginRecord.access_token_valid_till < new Date();
  }

  /*
   * Determine whether a provided refresh token is valid for a login record: it must match the
   * stored hash and must not be expired.
   *
   * @param {LoginRecord} loginRecord - The login record to evaluate.
   * @param {string} refreshToken - The raw refresh token presented by the client.
   * @returns {boolean}
   */
  isRefreshTokenValid(loginRecord: LoginRecord, refreshToken: string): boolean {
    const matches = loginRecord.refresh_token === this.hashToken(refreshToken);
    const notExpired = loginRecord.refresh_token_valid_till >= new Date();
    return matches && notExpired;
  }

  /*
   * Mark a login record as expired in the database.
   *
   * @param {LoginRecord} loginRecord - The login record to expire.
   * @param {TransactionOptions} transactionOptions - Optional database transaction session.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — if a database error occurs.
   */
  async expireLoginRecord(loginRecord: LoginRecord, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      loginRecord.status = 'expired';
      await this.loginRecordRepository.update(loginRecord.id, loginRecord, transactionOptions);
    });
  }

  /*
   * Mark a login record as revoked (explicit logout) in the database.
   *
   * @param {LoginRecord} loginRecord - The login record to revoke.
   * @param {TransactionOptions} transactionOptions - Optional database transaction session.
   * @returns {Promise<void>}
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — if a database error occurs.
   */
  async revokeLoginRecord(loginRecord: LoginRecord, transactionOptions?: TransactionOptions): Promise<void> {
    return this.wrapInfrastructureErrors(async () => {
      loginRecord.status = 'revoked';
      loginRecord.access_token_valid_till = new Date();
      await this.loginRecordRepository.update(loginRecord.id, loginRecord, transactionOptions);
    });
  }

  /*
   * Issue a brand-new active login session for a user, used when rotating tokens on refresh.
   *
   * @param {string} userId - The user the new session belongs to.
   * @param {string} groups - The user-group ID to embed in the new access token.
   * @param {TransactionOptions} transactionOptions - Optional database transaction session.
   * @returns {Promise<{ accessToken: string; refreshToken: string; loginRecord: LoginRecord }>}
   * @throws {DomainServiceError} INFRASTRUCTURE_ERROR — if a database error occurs.
   */
  async createLoginRecord(
    userId: string,
    groups: string,
    transactionOptions?: TransactionOptions,
  ): Promise<{ accessToken: string; refreshToken: string; loginRecord: LoginRecord }> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.issueTokensAndRecord(userId, groups, transactionOptions);
    });
  }
}

export default LoginService;
