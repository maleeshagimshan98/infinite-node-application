/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

export interface INewResource {
  id?: string;
  name: string;
  description?: string;
}

export interface IResource extends INewResource {
  id: string;
}

export class NewResource extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  protected _description: string | undefined;

  constructor(data: INewResource) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._name = data.name;
    if (data.description !== undefined) {
      this._description = data.description;
    }
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  // Setters
  set name(value: string) {
    this._name = value;
  }

  set description(value: string | undefined) {
    this._description = value;
  }
}

export class Resource extends NewResource {
  protected _id: string;

  constructor(data: IResource) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }
}

export default Resource;
