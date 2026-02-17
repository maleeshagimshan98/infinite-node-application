/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Types } from 'mongoose';

type LoginRecordStatus = 'active' | 'cancelled' | 'expired';

export interface ILoginRecord {
  _id: string | Types.ObjectId | undefined;
  user_id: string;
  token: string;
  valid_till: Date;
  status: LoginRecordStatus;
}

export class LoginRecord {
  private __id: string | Types.ObjectId | undefined;
  private _user_id: string;
  private _token: string;
  private _valid_till: Date;
  private _status: LoginRecordStatus;

  constructor(data: ILoginRecord) {
    this.__id = data._id;
    this._user_id = data.user_id;
    this._token = data.token;
    this._valid_till = data.valid_till;
    this._status = data.status;
  }

  // Getters
  get _id(): string | Types.ObjectId | undefined {
    return this.__id;
  }

  get user_id(): string {
    return this._user_id;
  }

  get token(): string {
    return this._token;
  }

  get valid_till(): Date {
    return this._valid_till;
  }

  get status(): LoginRecordStatus {
    return this._status;
  }

  // Setters
  set user_id(value: string) {
    this._user_id = value;
  }

  set token(value: string) {
    this._token = value;
  }

  set valid_till(value: Date) {
    this._valid_till = value;
  }

  set status(value: LoginRecordStatus) {
    this._status = value;
  }
}
