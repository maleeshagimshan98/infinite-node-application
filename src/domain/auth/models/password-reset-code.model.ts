/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Types } from 'mongoose';

type PasswordResetCodeStatus = 'active' | 'used' | 'cancelled' | 'expired';

export interface IPasswordResetCode {
  _id: string | Types.ObjectId | undefined;
  email: string;
  code: string;
  valid_till: Date;
  status: PasswordResetCodeStatus;
}

export class PasswordResetCode {
  private __id: string | Types.ObjectId | undefined;
  private _email: string;
  private _code: string;
  private _valid_till: Date;
  private _status: PasswordResetCodeStatus;

  constructor(data: IPasswordResetCode) {
    this.__id = data._id;
    this._email = data.email;
    this._code = data.code;
    this._valid_till = data.valid_till;
    this._status = data.status;
  }

  // Getters
  get _id(): string | Types.ObjectId | undefined {
    return this.__id;
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
