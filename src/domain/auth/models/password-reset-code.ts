/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';
import { DomainEntityError } from '../../base/DomainEntityError';

type PasswordResetCodeStatus = 'active' | 'used' | 'cancelled' | 'expired';

export interface INewPasswordResetCode {
  id?: string;
  email: string;
  code: string;
  valid_till: Date;
  status: PasswordResetCodeStatus;
}

export interface IPasswordResetCode extends INewPasswordResetCode {
  id: string;
}

export class NewPasswordResetCode extends DomainEntity {
  protected _id?: string;
  protected _email: string;
  protected _code: string;
  protected _valid_till: Date;
  protected _status: PasswordResetCodeStatus;

  constructor(data: INewPasswordResetCode) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._email = data.email;
    this._code = data.code;
    this._valid_till = data.valid_till;
    this._status = data.status;
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get code(): string {
    return this._code;
  }

  get valid_till(): Date {
    return this._valid_till;
  }

  get status(): PasswordResetCodeStatus {
    return this._status;
  }

  // Setters
  set id(value: string) {
    this._id = value;
  }

  set email(value: string) {
    this._email = value;
  }

  set code(value: string) {
    this._code = value;
  }

  set valid_till(value: Date) {
    this._valid_till = value;
  }

  set status(value: PasswordResetCodeStatus) {
    this._status = value;
  }
}

export class PasswordResetCode extends NewPasswordResetCode {
  protected _id: string;

  constructor(data: IPasswordResetCode) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  // All other getters and setters are inherited from NewPasswordResetCode

  /**
   * Determine whether the reset code has passed its validity window.
   *
   * @returns {boolean} True when the current time is at or past `valid_till`.
   */
  isExpired(): boolean {
    return this._valid_till < new Date();
  }

  /**
   * Mark the reset code as used after a successful password reset.
   *
   * @returns {void}
   * @throws {DomainEntityError} When the code is not active or has expired.
   */
  markUsed(): void {
    if (this._status !== 'active' || this.isExpired()) {
      throw new DomainEntityError('Password reset code is not active or has expired');
    }
    this._status = 'used';
  }

  /**
   * Cancel the reset code, superseding it regardless of its current status.
   *
   * @returns {void}
   */
  cancel(): void {
    this._status = 'cancelled';
  }
}
