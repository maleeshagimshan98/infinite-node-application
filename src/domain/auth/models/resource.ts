/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

export interface INewResource {
  id?: string;
  /** Set on a resource read from the database; in an update payload, the version the caller read. */
  version?: number;
  name: string;
  description?: string;
}

export interface IResource extends INewResource {
  id: string;
  version: number;
}

export class NewResource extends DomainEntity {
  protected _id?: string;
  protected _version?: number;
  protected _name: string;
  protected _description: string | undefined;

  constructor(data: INewResource) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    if (data.version !== undefined) {
      this._version = NewResource.checkVersion(data.version);
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

  get version(): number | undefined {
    return this._version;
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
  protected _version: number;

  constructor(data: IResource) {
    super(data);
    this._id = data.id;
    // Redeclared fields are reset after super() returns, so assign it here, as _id is.
    this._version = Resource.checkVersion(data.version);
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }
}

export default Resource;
