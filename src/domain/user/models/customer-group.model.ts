/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface INewCustomerGroup {
  _id?: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export interface ICustomerGroup {
  _id: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export class CustomerGroup {
  private __id: string;
  private _name: string;
  private _description: string;
  private _discount: number;
  private _default: boolean;

  constructor(data: ICustomerGroup) {
    this.__id = data._id;
    this._name = data.name;
    this._description = data.description;
    this._discount = data.discount;
    this._default = data.default;
  }

  get _id(): string {
    return this.__id;
  }

  // Getters
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
