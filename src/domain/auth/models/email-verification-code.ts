/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';
import { DomainEntityError } from '../../base/DomainEntityError';
import { normalizeEmail } from '../../base/normalize-email';

type EmailVerificationCodeStatus = 'pending' | 'verified' | 'expired';

export interface INewEmailVerificationCode {
  id?: string;
  /** Set on a verification code read from the database. */
  version?: number;
  user_id: string;
  email: string;
  code: string;
  status: EmailVerificationCodeStatus;
  valid_till: Date;
  verified_at?: Date;
}

export interface IEmailVerificationCode extends INewEmailVerificationCode {
  id: string;
  version: number;
}

export class NewEmailVerificationCode extends DomainEntity {
  protected _id?: string;
  protected _version?: number;
  protected _user_id: string;
  protected _email: string;
  protected _code: string;
  protected _status: EmailVerificationCodeStatus;
  protected _valid_till: Date;
  protected _verified_at?: Date;

  constructor(data: INewEmailVerificationCode) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    if (data.version !== undefined) {
      this._version = NewEmailVerificationCode.checkVersion(data.version);
    }
    this._user_id = data.user_id;
    this._email = normalizeEmail(data.email);
    this._code = data.code;
    this._status = data.status;
    this._valid_till = data.valid_till;
    if (data.verified_at) {
      this._verified_at = data.verified_at;
    }
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get version(): number | undefined {
    return this._version;
  }

  get user_id(): string {
    return this._user_id;
  }

  /**
   * The email address, trimmed and in lowercase (normalizeEmail()).
   */
  get email(): string {
    return this._email;
  }

  get code(): string {
    return this._code;
  }

  get status(): EmailVerificationCodeStatus {
    return this._status;
  }

  get valid_till(): Date {
    return this._valid_till;
  }

  get verified_at(): Date | undefined {
    return this._verified_at;
  }

  // Setters
  set id(value: string) {
    this._id = value;
  }

  set user_id(value: string) {
    this._user_id = value;
  }

  set email(value: string) {
    this._email = normalizeEmail(value);
  }

  set code(value: string) {
    this._code = value;
  }

  set status(value: EmailVerificationCodeStatus) {
    this._status = value;
  }

  set valid_till(value: Date) {
    this._valid_till = value;
  }

  set verified_at(value: Date) {
    this._verified_at = value;
  }
}

export class EmailVerificationCode extends NewEmailVerificationCode {
  protected _id: string;
  protected _version: number;

  constructor(data: IEmailVerificationCode) {
    super(data);
    this._id = data.id;
    // Redeclared fields are reset after super() returns, so assign it here, as _id is.
    this._version = EmailVerificationCode.checkVersion(data.version);
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  // All other getters and setters are inherited from NewEmailVerificationCode

  /**
   * Determine whether the verification code has passed its validity window.
   *
   * @returns {boolean} True when the current time is at or past `valid_till`.
   */
  isExpired(): boolean {
    return this._valid_till < new Date();
  }

  /**
   * Mark the verification code as verified after a successful email verification.
   *
   * @returns {void}
   * @throws {DomainEntityError} When the code is not pending or has expired.
   */
  markVerified(): void {
    if (this._status !== 'pending' || this.isExpired()) {
      throw new DomainEntityError('Email verification code is not pending or has expired');
    }
    this._status = 'verified';
    this._verified_at = new Date();
  }

  /**
   * Expire the verification code, superseding it regardless of its current status.
   *
   * @returns {void}
   */
  expire(): void {
    this._status = 'expired';
  }
}

export default EmailVerificationCode;
