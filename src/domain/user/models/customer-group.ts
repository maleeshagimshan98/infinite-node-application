/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface INewCustomerGroup {
  id?: string;
  name: string;
  description: string;
  discount: number;
  default: boolean;
}

export interface ICustomerGroup extends INewCustomerGroup {
  id: string;
}

export class NewCustomerGroup {
  protected _id?: string;
  protected _name: string;
  protected _description: string;
  protected _discount: number;
  protected _default: boolean;

  constructor(data: INewCustomerGroup) {
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

export class CustomerGroup extends NewCustomerGroup {
  protected _id: string;

  constructor(data: ICustomerGroup) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  // All other getters and setters are inherited from NewCustomerGroup
  // Business logic methods can be added here
}
