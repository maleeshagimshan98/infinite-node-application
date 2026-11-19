/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

export interface INewUserGroup {
  id?: string;
  /** Set on a user group read from the database; in an update payload, the version the caller read. */
  version?: number;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export interface IUserGroup extends INewUserGroup {
  id: string;
  version: number;
}

export class NewUserGroup extends DomainEntity {
  protected _id?: string;
  protected _version?: number;
  protected _name: string;
  protected _description: string;
  protected _discount: number;
  protected _default: boolean;

  constructor(data: INewUserGroup) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    if (data.version !== undefined) {
      this._version = NewUserGroup.checkVersion(data.version);
    }
    this._name = data.name;
    this._description = data.description;
    this._discount = data.discount;
    this._default = data.default;
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get version(): number | undefined {
    return this._version;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get discount(): number {
    return this._discount;
  }

  get default(): boolean {
    return this._default;
  }

  // Setters
  set id(value: string) {
    this._id = value;
  }

  set name(value: string) {
    this._name = value;
  }

  set description(value: string) {
    this._description = value;
  }

  set discount(value: number) {
    this._discount = value;
  }

  set default(value: boolean) {
    this._default = value;
  }
}

export class UserGroup extends NewUserGroup {
  protected _id: string;
  protected _version: number;

  constructor(data: IUserGroup) {
    super(data);
    this._id = data.id;
    // Redeclared fields are reset after super() returns, so assign it here, as _id is.
    this._version = UserGroup.checkVersion(data.version);
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }
}

export default UserGroup;
