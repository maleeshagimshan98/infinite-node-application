/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

type LoginRecordStatus = 'active' | 'cancelled' | 'expired';

export interface INewLoginRecord {
  id?: string;
  user_id: string;
  token: string;
  valid_till: Date;
  status: LoginRecordStatus;
}

export interface ILoginRecord extends INewLoginRecord {
  id: string;
}

export class NewLoginRecord extends DomainEntity {
  protected _id?: string;
  protected _user_id: string;
  protected _token: string;
  protected _valid_till: Date;
  protected _status: LoginRecordStatus;

  constructor(data: INewLoginRecord) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._user_id = data.user_id;
    this._token = data.token;
    this._valid_till = data.valid_till;
    this._status = data.status;
  }

  // Getters
  get id(): string | undefined {
    return this._id;
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
  set id(value: string) {
    this._id = value;
  }

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

export class LoginRecord extends NewLoginRecord {
  protected _id: string;

  constructor(data: ILoginRecord) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  // All other getters and setters are inherited from NewLoginRecord
  // Business logic methods can be added here
}
