/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

export type LoginRecordStatus = 'active' | 'expired' | 'revoked';

export interface INewLoginRecord {
  id?: string;
  user_id: string;
  token: string;
  refresh_token: string;
  access_token_valid_till: Date;
  refresh_token_valid_till: Date;
  status: LoginRecordStatus;
}

export interface ILoginRecord extends INewLoginRecord {
  id: string;
}

export class NewLoginRecord extends DomainEntity {
  protected _id?: string;
  protected _user_id: string;
  protected _token: string;
  protected _refresh_token: string;
  protected _access_token_valid_till: Date;
  protected _refresh_token_valid_till: Date;
  protected _status: LoginRecordStatus;

  constructor(data: INewLoginRecord) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._user_id = data.user_id;
    this._token = data.token;
    this._refresh_token = data.refresh_token;
    this._access_token_valid_till = data.access_token_valid_till;
    this._refresh_token_valid_till = data.refresh_token_valid_till;
    this._status = data.status;
  }

  get id(): string | undefined {
    return this._id;
  }

  get user_id(): string {
    return this._user_id;
  }

  get token(): string {
    return this._token;
  }

  get refresh_token(): string {
    return this._refresh_token;
  }

  get access_token_valid_till(): Date {
    return this._access_token_valid_till;
  }

  get refresh_token_valid_till(): Date {
    return this._refresh_token_valid_till;
  }

  get status(): LoginRecordStatus {
    return this._status;
  }

  set id(value: string) {
    this._id = value;
  }

  set token(value: string) {
    this._token = value;
  }

  set refresh_token(value: string) {
    this._refresh_token = value;
  }

  set access_token_valid_till(value: Date) {
    this._access_token_valid_till = value;
  }

  set refresh_token_valid_till(value: Date) {
    this._refresh_token_valid_till = value;
  }

  set status(value: LoginRecordStatus) {
    this._status = value;
  }
}

export class LoginRecord extends NewLoginRecord {
  protected _id: string;

  constructor(data: ILoginRecord) {
    super(data);
    this._id = data.id;
  }

  get id(): string {
    return this._id;
  }
}

export default LoginRecord;
