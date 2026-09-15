/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Role } from '@/domain/auth/models/role';

import { DomainEntity } from '../../base/DomainEntity';
import { DomainEntityError } from '../../base/DomainEntityError';

type UserStatus = 'pending_verification' | 'active' | 'suspended';

export interface INewUser {
  id?: string;
  email: string;
  password: string;
  status: UserStatus;
  ug_id: string;
  role_id: string;
  role?: Role;
}

export interface IUser extends INewUser {
  id: string;
}

export class NewUser extends DomainEntity {
  protected _id?: string;
  protected _email: string;
  protected _password: string;
  protected _status: UserStatus;
  protected _ug_id: string;
  protected _role_id: string;
  protected _role: Role | undefined;

  constructor(data: INewUser) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._email = data.email;
    this._password = data.password;
    this._status = data.status;
    this._ug_id = data.ug_id;
    this._role_id = data.role_id;
    if (data.role !== undefined) {
      this._role = data.role;
    }
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

  get ug_id(): string {
    return this._ug_id;
  }

  get role_id(): string {
    return this._role_id;
  }

  get role(): Role | undefined {
    return this._role;
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

  set ug_id(value: string) {
    this._ug_id = value;
  }

  set role_id(value: string) {
    this._role_id = value;
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

  /**
   * Activate a pending-verification user account.
   *
   * @returns {void}
   * @throws {DomainEntityError} When the user is not currently pending verification (already active or suspended).
   */
  activate(): void {
    if (this._status !== 'pending_verification') {
      throw new DomainEntityError('User must be pending verification to be activated');
    }
    this._status = 'active';
  }

  /**
   * Determine whether the user account is active.
   *
   * @returns {boolean} True when the user's status is 'active'.
   */
  isActive(): boolean {
    return this._status === 'active';
  }
}

export default User;
