/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

export interface INewUserGroup {
  id?: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export interface IUserGroup extends INewUserGroup {
  id: string;
}

export class NewUserGroup extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  protected _description: string;
  protected _discount: number;
  protected _default: boolean;

  constructor(data: INewUserGroup) {
    super();
    if (data.id) {
      this._id = data.id;
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

  constructor(data: IUserGroup) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }
}

export default UserGroup;
