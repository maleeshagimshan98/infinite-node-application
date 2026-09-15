/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

import type { Resource } from './resource';

export interface IPermission {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

/** Write-time shape: which resource (by id) gets which permission flags. */
export interface INewResourcePermission {
  resource_id: string;
  permission: IPermission;
}

/** Read-time (populated) shape: the same pairing, with a fully hydrated Resource. */
export interface IResourcePermission {
  resource: Resource;
  permission: IPermission;
}

export interface INewRole {
  id?: string;
  name: string;
  description?: string;
  default: boolean;
  resource_permissions: INewResourcePermission[];
  resources?: IResourcePermission[];
}

export interface IRole extends INewRole {
  id: string;
}

export class NewRole extends DomainEntity {
  protected _id?: string;
  protected _name: string;
  protected _description: string | undefined;
  protected _default: boolean;
  protected _resource_permissions: INewResourcePermission[];
  protected _resources: IResourcePermission[];

  constructor(data: INewRole) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    this._name = data.name;
    if (data.description !== undefined) {
      this._description = data.description;
    }
    this._default = data.default;
    this._resource_permissions = data.resource_permissions;
    this._resources = data.resources ?? [];
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

  get default(): boolean {
    return this._default;
  }

  get resource_permissions(): INewResourcePermission[] {
    return this._resource_permissions;
  }

  /**
   * The ids of every Resource this role has been granted a permission on.
   *
   * @returns {string[]} Resource ids, always derived from `resource_permissions` so it can never
   * drift out of sync with the underlying permission data.
   */
  get resource_ids(): string[] {
    return this._resource_permissions.map((rp) => rp.resource_id);
  }

  /**
   * The populated read view of this role's granted resources and their permission flags.
   *
   * @returns {IResourcePermission[]} Empty when the role was constructed without population.
   */
  get resources(): IResourcePermission[] {
    return this._resources;
  }

  // Setters
  set name(value: string) {
    this._name = value;
  }

  set description(value: string | undefined) {
    this._description = value;
  }

  set default(value: boolean) {
    this._default = value;
  }

  set resource_permissions(value: INewResourcePermission[]) {
    this._resource_permissions = value;
  }
}

export class Role extends NewRole {
  protected _id: string;

  constructor(data: IRole) {
    super(data);
    this._id = data.id;
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }
}

export default Role;
