/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

type UserStatus = 'pending_verification' | 'active' | 'suspended';

export interface INewUser {
  id?: string;
  email: string;
  password: string;
  status: UserStatus;
  cg_id: string;
}

export interface IUser extends INewUser {
  id: string;
}

export class NewUser extends DomainEntity {
  protected _id?: string;
  protected _email: string;
  protected _password: string;
  protected _status: UserStatus;
  protected _cg_id: string;

  constructor(data: INewUser) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._email = data.email;
    this._password = data.password;
    this._status = data.status;
    this._cg_id = data.cg_id;
  }

  // Getters
  get id(): string | undefined {
    return this._id;
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

  // Setters
  set id(value: string) {
    this._id = value;
  }

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

export class User extends NewUser {
  protected _id: string;

  constructor(data: IUser) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  // All other getters and setters are inherited from NewUser
  // Business logic methods can be added here
  // Example: isActive(): boolean { return this._status === 'active'; }
}
