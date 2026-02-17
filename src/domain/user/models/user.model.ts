/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

type UserStatus = 'pending_verification' | 'active' | 'suspended';

export interface INewUser {
  _id: string | undefined;
  email: string;
  password: string;
  status: UserStatus;
  cg_id: string;
}

export interface IUser {
  _id: string;
  email: string;
  password: string;
  status: UserStatus;
  cg_id: string;
}

export class User {
  private __id: string | undefined;
  private _email: string;
  private _password: string;
  private _status: UserStatus;
  private _cg_id: string;

  constructor(data: INewUser) {
    this.__id = data._id;
    this._email = data.email;
    this._password = data.password;
    this._status = data.status;
    this._cg_id = data.cg_id;
  }

  // Getters
  get _id(): string | undefined {
    return this.__id;
  }

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }

  get status(): UserStatus {
    return this._status;
  }

  get cg_id(): string {
    return this._cg_id;
  }

  // // Setters
  // set id(value: string) {
  //   this._id = value;
  // }

  set email(value: string) {
    this._email = value;
  }

  set password(value: string) {
    this._password = value;
  }

  set status(value: UserStatus) {
    this._status = value;
  }

  set cg_id(value: string) {
    this._cg_id = value;
  }
}
